// Optimized WebGL2 Renderer, Cached Uniforms, Smooth HDR Bloom, and Fast High-Quality Sky/Aurora/Forest Shader
(() => {
  const mat4 = {
    perspective(fovDeg, aspect, near, far) {
      const f = 1.0 / Math.tan((fovDeg * Math.PI) / 360);
      const nf = 1.0 / (near - far);
      return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0,
      ]);
    },
    lookAt(eye, target, up) {
      let zx = eye[0] - target[0];
      let zy = eye[1] - target[1];
      let zz = eye[2] - target[2];
      const zLen = Math.hypot(zx, zy, zz) || 1;
      zx /= zLen; zy /= zLen; zz /= zLen;

      let xx = up[1] * zz - up[2] * zy;
      let xy = up[2] * zx - up[0] * zz;
      let xz = up[0] * zy - up[1] * zx;
      const xLen = Math.hypot(xx, xy, xz) || 1;
      xx /= xLen; xy /= xLen; xz /= xLen;

      const yx = zy * xz - zz * xy;
      const yy = zz * xx - zx * xz;
      const yz = zx * xy - zy * xx;

      return new Float32Array([
        xx, yx, zx, 0,
        xy, yy, zy, 0,
        xz, yz, zz, 0,
        -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
        -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
        -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
        1,
      ]);
    },
    invert3x3From4(m) {
      return new Float32Array([
        m[0], m[4], m[8],
        m[1], m[5], m[9],
        m[2], m[6], m[10],
      ]);
    },
  };

  function compileProgram(gl, vsSrc, fsSrc) {
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(sh) || "Shader compile error");
      }
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || "Program link error");
    }
    return prog;
  }

  function getUniforms(gl, prog, names) {
    const u = {};
    for (const n of names) u[n] = gl.getUniformLocation(prog, n);
    return u;
  }

  function createCamera({ fov = 36, near = 0.05, far = 1200 } = {}) {
    return {
      fov,
      near,
      far,
      eye: [0, 4.85, 22.4],
      target: [0, 5.25, 0],
      up: [0, 1, 0],
      aspect: 16 / 9,
      proj: mat4.perspective(fov, 16 / 9, near, far),
      view: mat4.lookAt([0, 4.85, 22.4], [0, 5.25, 0], [0, 1, 0]),
      update(width, height) {
        this.aspect = width / Math.max(1, height);
        this.proj = mat4.perspective(this.fov, this.aspect, this.near, this.far);
        this.view = mat4.lookAt(this.eye, this.target, this.up);
      },
      project(point, width, height) {
        const [x, y, z] = point;
        const v = this.view;
        const p = this.proj;
        const vx = v[0] * x + v[4] * y + v[8] * z + v[12];
        const vy = v[1] * x + v[5] * y + v[9] * z + v[13];
        const vz = v[2] * x + v[6] * y + v[10] * z + v[14];
        const vw = v[3] * x + v[7] * y + v[11] * z + v[15];
        const cx = p[0] * vx + p[4] * vy + p[8] * vz + p[12] * vw;
        const cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13] * vw;
        const cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15] * vw;
        if (cw <= 0.001) return null;
        return {
          x: (cx / cw * 0.5 + 0.5) * width,
          y: (0.5 - cy / cw * 0.5) * height,
          depth: -vz,
        };
      },
    };
  }

  function createFBO(gl, width, height, internalFormat, format, type) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, width, height };
  }

  function destroyFBO(gl, target) {
    if (!target) return;
    gl.deleteFramebuffer(target.fbo);
    gl.deleteTexture(target.tex);
  }

  function createBloom(gl, { threshold = 0.65, knee = 0.45, streak = 0.48 } = {}) {
    return { threshold, knee, streak };
  }

  function createRenderer(gl, { hdr = true } = {}) {
    const extFloat = hdr ? gl.getExtension("EXT_color_buffer_float") : null;
    const useHalfFloat = Boolean(hdr && extFloat);
    const texIF = useHalfFloat ? gl.RGBA16F : gl.RGBA8;
    const texType = useHalfFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

    const quadVAO = gl.createVertexArray();
    const quadVBO = gl.createBuffer();
    gl.bindVertexArray(quadVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1,  1, 1, -1,  1, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const quadVS = `#version 300 es
      layout(location = 0) in vec2 aPos;
      out vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    // Fast analytical Aurora + Tiered Conifer Silhouettes + Anisotropic Ice Lake Reflection
    const skyFS = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 fragColor;

      uniform float uTime;
      uniform float uAspect;
      uniform float uTanHalfFov;
      uniform mat3 uCamRot;
      uniform float uAuroraFade;
      uniform float uTreeGlow;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm2(vec2 p) {
        return noise(p) * 0.65 + noise(p * 2.07 + vec2(4.3, 1.9)) * 0.35;
      }

      vec3 aurora(vec3 dir) {
        float h = max(dir.y, 0.0);
        if (h <= 0.015) return vec3(0.0);
        vec2 baseP = dir.xz / (h + 0.32);
        vec3 acc = vec3(0.0);
        for (int i = 0; i < 7; i++) {
          float s = float(i) / 6.0;
          vec2 p = baseP * (0.72 + s * 0.42);
          float wave = sin(p.x * 1.15 + uTime * 0.14 + s * 2.4) * 0.55
                     + sin(p.x * 2.30 - uTime * 0.09 + s * 4.1) * 0.25;
          float d = abs(p.y - wave + 0.45 - s * 0.55);
          float ribbon = exp(-d * d * 3.8);
          float rays = 0.55 + 0.45 * fbm2(vec2(p.x * 2.4 + uTime * 0.08, p.y * 0.8 + s * 3.0));
          vec3 tint = mix(vec3(0.05, 0.78, 0.56), vec3(0.16, 0.52, 0.88), s * 0.65);
          acc += tint * ribbon * rays * (1.0 - s * 0.62) * 0.12;
        }
        float mask = smoothstep(0.04, 0.24, h) * smoothstep(0.88, 0.26, h);
        return acc * mask * uAuroraFade;
      }

      vec2 pineForest(float angleX, float elevY) {
        float maxMask = 0.0;
        float depthShade = 1.0;
        for (int layer = 0; layer < 3; layer++) {
          float fl = float(layer);
          float freq = layer == 0 ? 11.0 : (layer == 1 ? 17.5 : 26.0);
          float shift = fl * 2.13 + 0.4;
          float cell = floor(angleX * freq + shift);
          float fx = fract(angleX * freq + shift) - 0.5;
          float rnd = hash(vec2(cell, fl * 19.7));
          if (rnd > 0.26) {
            float treeH = (layer == 0 ? 0.135 : (layer == 1 ? 0.095 : 0.062)) * (0.62 + 0.65 * fract(rnd * 7.3));
            float treeW = 0.36 + 0.12 * fract(rnd * 3.9);
            float xOff = (fract(rnd * 13.1) - 0.5) * 0.26;
            float dx = abs(fx - xOff);
            float baseElev = -0.025 + (fract(rnd * 27.3) - 0.5) * 0.015;
            float ny = (elevY - baseElev) / treeH;
            if (ny >= 0.0 && ny <= 1.0) {
              float boughs = 5.0 + floor(fract(rnd * 11.7) * 3.0);
              float tierFrac = fract(ny * boughs);
              float notch = 0.72 + 0.38 * (1.0 - tierFrac);
              float halfW = (1.0 - ny * 0.96) * treeW * mix(notch, 1.0, smoothstep(0.75, 1.0, ny));
              float hit = smoothstep(halfW + 0.010, halfW - 0.008, dx);
              if (hit > maxMask) {
                maxMask = hit;
                depthShade = layer == 0 ? 1.0 : (layer == 1 ? 0.65 : 0.38);
              }
            }
          }
        }
        return vec2(maxMask, depthShade);
      }

      void main() {
        vec2 ndc = vUv * 2.0 - 1.0;
        vec3 rayView = normalize(vec3(ndc.x * uAspect * uTanHalfFov, ndc.y * uTanHalfFov, -1.0));
        vec3 dir = normalize(uCamRot * rayView);

        float skyT = clamp(dir.y * 2.1, 0.0, 1.0);
        vec3 sky = mix(vec3(0.0030, 0.0090, 0.028), vec3(0.0007, 0.0020, 0.0085), skyT);

        if (dir.y > 0.025) {
          vec2 sg = vec2(atan(dir.x, -dir.z) * 125.0, dir.y * 240.0);
          vec2 id = floor(sg);
          vec2 gv = fract(sg) - 0.5;
          float h = hash(id);
          if (h > 0.978) {
            float tw = 0.55 + 0.45 * sin(uTime * (1.4 + h * 2.6) + h * 50.0);
            sky += vec3(0.55, 0.72, 1.0) * smoothstep(0.18, 0.0, length(gv)) * tw * 0.28;
          }
        }

        vec3 color = sky + aurora(dir);

        float mist = exp(-abs(dir.y + 0.008) * 16.0);
        color += vec3(0.0045, 0.015, 0.036) * mist;

        float angleX = atan(dir.x, -dir.z);
        if (dir.y > -0.035 && dir.y < 0.22) {
          vec2 pf = pineForest(angleX, dir.y + 0.012);
          if (pf.x > 0.001) {
            vec3 nearPine = vec3(0.0007, 0.0018, 0.0065);
            vec3 farPine = vec3(0.0025, 0.0075, 0.022);
            vec3 pineCol = mix(farPine, nearPine, pf.y);
            float baseMist = smoothstep(-0.025, 0.035, dir.y);
            color = mix(color, pineCol, pf.x * (0.45 + 0.50 * baseMist));
          }
        }

        if (dir.y < 0.0) {
          float tGround = -4.6 / min(dir.y, -0.012);
          vec2 gp = dir.xz * tGround;
          float r1 = fbm2(vec2(gp.x * 0.42 + uTime * 0.05, gp.y * 1.65 - uTime * 0.04));
          float r2 = noise(vec2(gp.x * 1.15 - uTime * 0.07, gp.y * 3.8));
          float sheen = smoothstep(0.46, 0.84, r1 * 0.72 + r2 * 0.28);
          float distFade = exp(-length(gp) * 0.036);

          vec3 groundBase = vec3(0.0012, 0.0036, 0.012);
          vec3 aurRefl = vec3(0.010, 0.078, 0.062) * sheen * distFade * (0.25 + 0.75 * uAuroraFade);

          float centerGlow = exp(-gp.x * gp.x * 0.055) * smoothstep(26.0, 2.0, abs(gp.y));
          vec3 treeRefl = vec3(0.032, 0.065, 0.135) * centerGlow * uTreeGlow * (0.45 + 0.55 * sheen);

          float horizonBlend = smoothstep(-0.065, 0.0, dir.y);
          color = mix(groundBase + aurRefl + treeRefl, color, horizonBlend * 0.82);
        }

        fragColor = vec4(color, 1.0);
      }
    `;

    const brightFS = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 fragColor;
      uniform sampler2D uTex;
      uniform float uThreshold;
      uniform float uKnee;
      void main() {
        vec3 c = texture(uTex, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
        soft = (soft * soft) / (4.0 * uKnee + 1e-5);
        float contrib = max(soft, br - uThreshold) / max(br, 1e-5);
        fragColor = vec4(c * max(contrib, 0.0), 1.0);
      }
    `;

    const blurFS = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 fragColor;
      uniform sampler2D uTex;
      uniform vec2 uDir;
      void main() {
        vec3 sum = texture(uTex, vUv).rgb * 0.227027;
        sum += texture(uTex, vUv + uDir * 1.384615).rgb * 0.316216;
        sum += texture(uTex, vUv - uDir * 1.384615).rgb * 0.316216;
        sum += texture(uTex, vUv + uDir * 3.230769).rgb * 0.070270;
        sum += texture(uTex, vUv - uDir * 3.230769).rgb * 0.070270;
        fragColor = vec4(sum, 1.0);
      }
    `;

    const compositeFS = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 fragColor;
      uniform sampler2D uScene;
      uniform sampler2D uBloom0;
      uniform sampler2D uBloom1;
      uniform sampler2D uStreak;
      uniform float uStreakAmt;

      vec3 aces(vec3 x) {
        float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
        return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
      }

      void main() {
        vec3 scene = texture(uScene, vUv).rgb;
        vec3 bloom = texture(uBloom0, vUv).rgb * 0.52 + texture(uBloom1, vUv).rgb * 0.42;
        vec3 streak = texture(uStreak, vUv).rgb * uStreakAmt;
        vec3 mapped = aces((scene + bloom * 0.78 + streak * 0.45) * 1.08);
        fragColor = vec4(pow(mapped, vec3(1.0 / 2.2)), 1.0);
      }
    `;

    const skyProg = compileProgram(gl, quadVS, skyFS);
    const brightProg = compileProgram(gl, quadVS, brightFS);
    const blurProg = compileProgram(gl, quadVS, blurFS);
    const compProg = compileProgram(gl, quadVS, compositeFS);

    const skyU = getUniforms(gl, skyProg, ["uTime", "uAspect", "uTanHalfFov", "uCamRot", "uAuroraFade", "uTreeGlow"]);
    const brightU = getUniforms(gl, brightProg, ["uTex", "uThreshold", "uKnee"]);
    const blurU = getUniforms(gl, blurProg, ["uTex", "uDir"]);
    const compU = getUniforms(gl, compProg, ["uScene", "uBloom0", "uBloom1", "uStreak", "uStreakAmt"]);

    let w = 1, h = 1;
    let sceneFBO = null;
    let mipFBOs = [];
    let streakA = null, streakB = null;

    function allocate(width, height) {
      destroyFBO(gl, sceneFBO);
      for (const m of mipFBOs) { destroyFBO(gl, m.a); destroyFBO(gl, m.b); }
      destroyFBO(gl, streakA);
      destroyFBO(gl, streakB);

      w = Math.max(2, width);
      h = Math.max(2, height);
      sceneFBO = createFBO(gl, w, h, texIF, gl.RGBA, texType);
      mipFBOs = [];
      let mw = Math.max(2, w >> 2);
      let mh = Math.max(2, h >> 2);
      for (let i = 0; i < 2; i++) {
        mipFBOs.push({
          a: createFBO(gl, mw, mh, texIF, gl.RGBA, texType),
          b: createFBO(gl, mw, mh, texIF, gl.RGBA, texType),
        });
        mw = Math.max(2, mw >> 1);
        mh = Math.max(2, mh >> 1);
      }
      streakA = createFBO(gl, Math.max(2, w >> 3), Math.max(2, h >> 3), texIF, gl.RGBA, texType);
      streakB = createFBO(gl, Math.max(2, w >> 3), Math.max(2, h >> 3), texIF, gl.RGBA, texType);
    }

    return {
      quadVAO,
      resize(width, height) { allocate(width, height); },
      beginScene() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFBO.fbo);
        gl.viewport(0, 0, w, h);
        gl.clearColor(0.002, 0.006, 0.018, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      },
      drawSky(camera, time, auroraFade, treeGlow) {
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(skyProg);
        gl.uniform1f(skyU.uTime, time);
        gl.uniform1f(skyU.uAspect, camera.aspect);
        gl.uniform1f(skyU.uTanHalfFov, Math.tan((camera.fov * Math.PI) / 360));
        gl.uniformMatrix3fv(skyU.uCamRot, false, mat4.invert3x3From4(camera.view));
        gl.uniform1f(skyU.uAuroraFade, auroraFade);
        gl.uniform1f(skyU.uTreeGlow, treeGlow);
        gl.bindVertexArray(quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
      },
      endSceneAndBloom(bloom) {
        gl.disable(gl.BLEND);
        gl.bindVertexArray(quadVAO);

        const m0 = mipFBOs[0];
        gl.bindFramebuffer(gl.FRAMEBUFFER, m0.a.fbo);
        gl.viewport(0, 0, m0.a.width, m0.a.height);
        gl.useProgram(brightProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneFBO.tex);
        gl.uniform1i(brightU.uTex, 0);
        gl.uniform1f(brightU.uThreshold, bloom.threshold);
        gl.uniform1f(brightU.uKnee, bloom.knee);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.useProgram(blurProg);
        gl.uniform1i(blurU.uTex, 0);

        for (let i = 0; i < mipFBOs.length; i++) {
          const m = mipFBOs[i];
          if (i > 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, m.a.fbo);
            gl.viewport(0, 0, m.a.width, m.a.height);
            gl.bindTexture(gl.TEXTURE_2D, mipFBOs[i - 1].a.tex);
            gl.uniform2f(blurU.uDir, 1.2 / m.a.width, 0.0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, m.b.fbo);
          gl.viewport(0, 0, m.b.width, m.b.height);
          gl.bindTexture(gl.TEXTURE_2D, m.a.tex);
          gl.uniform2f(blurU.uDir, 1.5 / m.b.width, 0.0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);

          gl.bindFramebuffer(gl.FRAMEBUFFER, m.a.fbo);
          gl.bindTexture(gl.TEXTURE_2D, m.b.tex);
          gl.uniform2f(blurU.uDir, 0.0, 1.5 / m.a.height);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, streakA.fbo);
        gl.viewport(0, 0, streakA.width, streakA.height);
        gl.bindTexture(gl.TEXTURE_2D, mipFBOs[0].a.tex);
        gl.uniform2f(blurU.uDir, 3.8 / streakA.width, 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindFramebuffer(gl.FRAMEBUFFER, streakB.fbo);
        gl.bindTexture(gl.TEXTURE_2D, streakA.tex);
        gl.uniform2f(blurU.uDir, 6.5 / streakB.width, 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
        gl.useProgram(compProg);
        const bind = (loc, tex, unit) => {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.uniform1i(loc, unit);
        };
        bind(compU.uScene, sceneFBO.tex, 0);
        bind(compU.uBloom0, mipFBOs[0].a.tex, 1);
        bind(compU.uBloom1, mipFBOs[1].a.tex, 2);
        bind(compU.uStreak, streakB.tex, 3);
        gl.uniform1f(compU.uStreakAmt, bloom.streak);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
      },
      compileProgram,
      getUniforms,
    };
  }

  window.ChristmasEngine = {
    createRenderer,
    createBloom,
    createCamera,
    compileProgram,
    getUniforms,
  };
})();
