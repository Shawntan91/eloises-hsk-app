// High-Performance WebGL2 Particle & Ribbon Systems (60fps + Anti-Aliased Ribbons & Streamer Fireworks)
(() => {
  const { compileProgram, getUniforms } = window.ChristmasEngine;

  // ------------------------------------------------------------------
  // 1. Tree ParticleField (cached uniforms + 1/3-count fast reflection pass)
  // ------------------------------------------------------------------
  class ParticleField {
    constructor(gl, pointsData) {
      this.gl = gl;
      this.count = pointsData.length / 12;

      this.vao = gl.createVertexArray();
      this.vbo = gl.createBuffer();
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, pointsData, gl.STATIC_DRAW);

      const STRIDE = 12 * 4;
      const attr = (loc, size, off) => {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, off);
      };
      attr(0, 3, 0);
      attr(1, 3, 12);
      attr(2, 3, 24);
      attr(3, 1, 36);
      attr(4, 1, 40);
      attr(5, 1, 44);
      gl.bindVertexArray(null);

      this.prog = compileProgram(
        gl,
        `#version 300 es
        layout(location = 0) in vec3 aHome;
        layout(location = 1) in vec3 aBurst;
        layout(location = 2) in vec3 aColor;
        layout(location = 3) in float aSize;
        layout(location = 4) in float aPhase;
        layout(location = 5) in float aExtra;

        uniform mat4 uProj;
        uniform mat4 uView;
        uniform float uTime;
        uniform float uAngle;
        uniform float uGather;
        uniform float uVisibility;
        uniform float uReflect;
        uniform float uPixelRatio;

        out vec3 vColor;
        out float vAlpha;

        void main() {
          float k = clamp(uGather, 0.0, 1.0);
          float swirl = (1.0 - k) * (1.0 - k) * 4.2;
          vec3 p = mix(aBurst, aHome, k);

          float totalAngle = uAngle + swirl;
          float c = cos(totalAngle);
          float s = sin(totalAngle);
          p.xz = vec2(p.x * c - p.z * s, p.x * s + p.z * c);

          if (uReflect > 0.5) {
            p.y = -p.y * 0.90 - 0.14;
            p.x += sin(uTime * 2.0 + p.z * 1.4 + aPhase) * 0.18;
          }

          vec4 viewPos = uView * vec4(p, 1.0);
          gl_Position = uProj * viewPos;

          float dist = max(1.0, -viewPos.z);
          float twinkle = 0.72 + 0.28 * sin(uTime * 2.6 + aPhase);
          float sizeMul = mix(1.30, 0.94, k);
          gl_PointSize = clamp(aSize * sizeMul * uPixelRatio * (17.5 / dist), 1.0, 22.0);

          vColor = aColor * mix(1.12, 1.02, k);
          float baseAlpha = mix(0.28, 0.62, k) * uVisibility;
          if (uReflect > 0.5) {
            baseAlpha *= 0.34 * exp(-max(0.0, -p.y) * 0.14);
          }
          vAlpha = baseAlpha * twinkle;
        }`,
        `#version 300 es
        precision highp float;
        in vec3 vColor;
        in float vAlpha;
        out vec4 fragColor;

        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float d2 = dot(uv, uv);
          if (d2 > 1.0) discard;
          float edge = smoothstep(1.0, 0.42, sqrt(d2));
          float core = exp(-d2 * 6.2);
          float intensity = (core + 0.16 * exp(-d2 * 2.5)) * edge * vAlpha;
          fragColor = vec4(vColor * intensity, intensity);
        }`
      );
      this.u = getUniforms(gl, this.prog, [
        "uProj", "uView", "uTime", "uAngle", "uGather", "uVisibility", "uReflect", "uPixelRatio",
      ]);
    }

    draw(camera, { time, angle, gather, visibility, pixelRatio, reflect = false }) {
      if (visibility <= 0.001) return;
      const gl = this.gl;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.disable(gl.DEPTH_TEST);

      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.u.uProj, false, camera.proj);
      gl.uniformMatrix4fv(this.u.uView, false, camera.view);
      gl.uniform1f(this.u.uTime, time);
      gl.uniform1f(this.u.uAngle, angle);
      gl.uniform1f(this.u.uGather, gather);
      gl.uniform1f(this.u.uVisibility, visibility);
      gl.uniform1f(this.u.uReflect, reflect ? 1.0 : 0.0);
      gl.uniform1f(this.u.uPixelRatio, pixelRatio);

      gl.bindVertexArray(this.vao);
      const drawCount = reflect ? Math.floor(this.count / 3) : this.count;
      gl.drawArrays(gl.POINTS, 0, drawCount);
      gl.bindVertexArray(null);
    }
  }

  // ------------------------------------------------------------------
  // 2. Crisp Snowfall (4,800 snowflakes + soft foreground bokeh)
  // ------------------------------------------------------------------
  class Snowfall {
    constructor(gl, { count = 4800, area = 60, wind = [0.15, 0, 0.05] } = {}) {
      this.gl = gl;
      this.count = count;
      this.wind = wind;

      const arr = new Float32Array(count * 7);
      let s = 918273;
      const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };

      for (let i = 0; i < count; i++) {
        const o = i * 7;
        const x = (rand() - 0.5) * area;
        const y = rand() * 24.0 - 2.0;
        const z = (rand() - 0.5) * area * 0.72 + 2.0;
        const isBokeh = rand() < 0.045 && z > 6.5;
        arr[o + 0] = x;
        arr[o + 1] = y;
        arr[o + 2] = z;
        arr[o + 3] = isBokeh ? 13.0 + rand() * 16.0 : 2.2 + rand() * 3.0;
        arr[o + 4] = isBokeh ? 0.14 + rand() * 0.15 : 0.36 + rand() * 0.54;
        arr[o + 5] = rand() * 6.28318;
        arr[o + 6] = isBokeh ? 1.0 : 0.0;
      }

      this.vao = gl.createVertexArray();
      this.vbo = gl.createBuffer();
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
      gl.bindVertexArray(null);

      this.prog = compileProgram(
        gl,
        `#version 300 es
        layout(location = 0) in vec3 aPos;
        layout(location = 1) in vec4 aMeta;
        uniform mat4 uProj;
        uniform mat4 uView;
        uniform float uTime;
        uniform vec3 uWind;
        uniform float uVisibility;
        uniform float uPixelRatio;
        out float vAlpha;
        out float vBokeh;
        void main() {
          vec3 p = aPos;
          float speed = aMeta.w > 0.5 ? 1.65 : 1.05 + 0.55 * fract(aMeta.z);
          p.y = mod(p.y - uTime * speed + 2.0, 24.0) - 2.0;
          p.x = mod(p.x + uTime * uWind.x + sin(uTime * 0.7 + aMeta.z) * 0.6 + 30.0, 60.0) - 30.0;
          p.z += cos(uTime * 0.5 + aMeta.z * 1.3) * 0.4;

          vec4 viewPos = uView * vec4(p, 1.0);
          gl_Position = uProj * viewPos;
          float dist = max(1.5, -viewPos.z);
          gl_PointSize = clamp(aMeta.x * uPixelRatio * (14.0 / dist), 1.0, 48.0);
          vAlpha = aMeta.y * uVisibility * clamp(28.0 / (dist + 6.0), 0.28, 1.15);
          vBokeh = aMeta.w;
        }`,
        `#version 300 es
        precision highp float;
        in float vAlpha;
        in float vBokeh;
        out vec4 fragColor;
        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float d2 = dot(uv, uv);
          if (d2 > 1.0) discard;
          float d = sqrt(d2);
          float inten = vBokeh > 0.5
            ? (0.45 * exp(-d2 * 2.5) + 0.28 * smoothstep(0.95, 0.45, d)) * smoothstep(1.0, 0.72, d) * vAlpha
            : exp(-d2 * 5.2) * smoothstep(1.0, 0.45, d) * vAlpha;
          fragColor = vec4(vec3(0.86, 0.93, 1.0) * inten, inten);
        }`
      );
      this.u = getUniforms(gl, this.prog, ["uProj", "uView", "uTime", "uWind", "uVisibility", "uPixelRatio"]);
    }

    draw(camera, { time, visibility, pixelRatio }) {
      if (visibility <= 0.001) return;
      const gl = this.gl;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.u.uProj, false, camera.proj);
      gl.uniformMatrix4fv(this.u.uView, false, camera.view);
      gl.uniform1f(this.u.uTime, time);
      gl.uniform3fv(this.u.uWind, this.wind);
      gl.uniform1f(this.u.uVisibility, visibility);
      gl.uniform1f(this.u.uPixelRatio, pixelRatio);
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.POINTS, 0, this.count);
      gl.bindVertexArray(null);
    }
  }

  // ------------------------------------------------------------------
  // 3. Smooth Continuous Chrysanthemum Fireworks (GL_LINES + active-shell culling)
  // ------------------------------------------------------------------
  class Fireworks {
    constructor(gl, { shells = 12, startAt = 9.0 } = {}) {
      this.gl = gl;
      this.startAt = startAt;
      this.shellMeta = [];

      const verts = [];
      let s = 445566;
      const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };

      const palettes = [
        [0.64, 0.88, 1.00], // ice blue
        [1.00, 0.80, 0.42], // warm champagne gold
        [0.78, 0.72, 1.00], // cool lavender-silver
        [1.00, 0.86, 0.56], // bright gold
      ];

      const raysPerShell = 165;
      const segsPerRay = 7;

      for (let sh = 0; sh < shells; sh++) {
        const isLeft = sh % 2 === 0;
        const cx = (isLeft ? -1 : 1) * (6.2 + rand() * 3.0);
        const cy = 6.9 + rand() * 3.0;
        const cz = -2.2 + (rand() - 0.5) * 3.8;
        const t0 = startAt + sh * 1.25;
        const col = palettes[sh % palettes.length];
        const maxSpeed = 4.6 + rand() * 1.5;

        const startVert = verts.length / 11;
        for (let r = 0; r < raysPerShell; r++) {
          const phi = Math.acos(1 - (2 * (r + 0.5)) / raysPerShell);
          const theta = Math.PI * (1 + Math.sqrt(5)) * r + (rand() - 0.5) * 0.16;
          const spd = maxSpeed * (0.68 + 0.38 * rand());
          const vx = Math.sin(phi) * Math.cos(theta) * spd;
          const vy = Math.cos(phi) * spd;
          const vz = Math.sin(phi) * Math.sin(theta) * spd;

          for (let seg = 0; seg < segsPerRay; seg++) {
            const lag0 = seg / segsPerRay;
            const lag1 = (seg + 1) / segsPerRay;
            verts.push(cx, cy, cz, vx, vy, vz, col[0], col[1], col[2], t0, lag0);
            verts.push(cx, cy, cz, vx, vy, vz, col[0], col[1], col[2], t0, lag1);
          }
        }
        const vertCount = verts.length / 11 - startVert;
        this.shellMeta.push({ t0, startVert, vertCount });
      }

      const data = new Float32Array(verts);
      this.vao = gl.createVertexArray();
      this.vbo = gl.createBuffer();
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

      const STRIDE = 11 * 4;
      const attr = (loc, size, off) => {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, off);
      };
      attr(0, 3, 0);
      attr(1, 3, 12);
      attr(2, 3, 24);
      attr(3, 1, 36);
      attr(4, 1, 40);
      gl.bindVertexArray(null);

      this.prog = compileProgram(
        gl,
        `#version 300 es
        layout(location = 0) in vec3 aOrigin;
        layout(location = 1) in vec3 aVel;
        layout(location = 2) in vec3 aColor;
        layout(location = 3) in float aStart;
        layout(location = 4) in float aLag;

        uniform mat4 uProj;
        uniform mat4 uView;
        uniform float uTime;

        out vec3 vColor;
        out float vAlpha;

        void main() {
          float age = max(0.0, uTime - aStart);
          float tailSpan = mix(0.22, 0.52, clamp(age / 1.8, 0.0, 1.0));
          float tEff = max(0.0, age - aLag * tailSpan);
          float drag = 1.0 - exp(-tEff * 1.48);
          vec3 p = aOrigin + aVel * drag * 0.94;
          p.y -= 0.40 * tEff * tEff;

          gl_Position = uProj * uView * vec4(p, 1.0);
          float fade = smoothstep(0.0, 0.14, age) * (1.0 - smoothstep(1.4, 3.0, age));
          float head = pow(1.0 - aLag, 1.35);
          vColor = mix(aColor, vec3(1.0, 0.98, 0.94), head * 0.55);
          vAlpha = fade * head * 0.95;
        }`,
        `#version 300 es
        precision highp float;
        in vec3 vColor;
        in float vAlpha;
        out vec4 fragColor;
        void main() {
          if (vAlpha <= 0.002) discard;
          fragColor = vec4(vColor * vAlpha, vAlpha);
        }`
      );
      this.u = getUniforms(gl, this.prog, ["uProj", "uView", "uTime"]);
    }

    draw(camera, { time }) {
      if (time < this.startAt) return;
      const gl = this.gl;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.u.uProj, false, camera.proj);
      gl.uniformMatrix4fv(this.u.uView, false, camera.view);
      gl.uniform1f(this.u.uTime, time);
      gl.bindVertexArray(this.vao);
      for (const sh of this.shellMeta) {
        const age = time - sh.t0;
        if (age >= 0.0 && age <= 3.1) {
          gl.drawArrays(gl.LINES, sh.startVert, sh.vertCount);
        }
      }
      gl.bindVertexArray(null);
    }
  }

  // ------------------------------------------------------------------
  // 4. Fairy Lights + Glossy 3D Baubles
  // ------------------------------------------------------------------
  function createPointExtras(gl, lights, baubles) {
    const lightArr = new Float32Array(lights.length * 4);
    for (let i = 0; i < lights.length; i++) {
      const o = i * 4;
      lightArr[o + 0] = lights[i].pos[0];
      lightArr[o + 1] = lights[i].pos[1];
      lightArr[o + 2] = lights[i].pos[2];
      lightArr[o + 3] = lights[i].twinkle;
    }

    const lightVAO = gl.createVertexArray();
    const lightVBO = gl.createBuffer();
    gl.bindVertexArray(lightVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, lightVBO);
    gl.bufferData(gl.ARRAY_BUFFER, lightArr, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
    gl.bindVertexArray(null);

    const lightProg = compileProgram(
      gl,
      `#version 300 es
      layout(location = 0) in vec3 aPos;
      layout(location = 1) in float aTwinkle;
      uniform mat4 uProj;
      uniform mat4 uView;
      uniform float uTime;
      uniform float uAngle;
      uniform float uLightUp;
      uniform float uPixelRatio;
      out float vAlpha;
      void main() {
        vec3 p = aPos;
        float c = cos(uAngle), s = sin(uAngle);
        p.xz = vec2(p.x * c - p.z * s, p.x * s + p.z * c);
        vec4 viewPos = uView * vec4(p, 1.0);
        gl_Position = uProj * viewPos;
        float dist = max(1.0, -viewPos.z);
        float tw = 0.58 + 0.42 * sin(uTime * 3.2 + aTwinkle * 12.0);
        gl_PointSize = clamp(11.0 * uPixelRatio * (18.0 / dist), 1.0, 38.0);
        vAlpha = uLightUp * tw;
      }`,
      `#version 300 es
      precision highp float;
      in float vAlpha;
      out vec4 fragColor;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d2 = dot(uv, uv);
        if (d2 > 1.0) discard;
        float core = exp(-d2 * 14.0);
        float halo = 0.40 * exp(-d2 * 3.2);
        float inten = (core * 1.35 + halo) * smoothstep(1.0, 0.5, sqrt(d2)) * vAlpha;
        vec3 col = mix(vec3(1.0, 0.74, 0.38), vec3(1.0, 0.98, 0.90), core);
        fragColor = vec4(col * inten, inten);
      }`
    );
    const lightU = getUniforms(gl, lightProg, ["uProj", "uView", "uTime", "uAngle", "uLightUp", "uPixelRatio"]);

    const baubleArr = new Float32Array(baubles.length * 13);
    for (let i = 0; i < baubles.length; i++) {
      const b = baubles[i];
      const o = i * 13;
      baubleArr[o + 0] = b.pos[0]; baubleArr[o + 1] = b.pos[1]; baubleArr[o + 2] = b.pos[2];
      baubleArr[o + 3] = b.palette.base[0]; baubleArr[o + 4] = b.palette.base[1]; baubleArr[o + 5] = b.palette.base[2];
      baubleArr[o + 6] = b.palette.shade[0]; baubleArr[o + 7] = b.palette.shade[1]; baubleArr[o + 8] = b.palette.shade[2];
      baubleArr[o + 9] = b.palette.glint[0]; baubleArr[o + 10] = b.palette.glint[1]; baubleArr[o + 11] = b.palette.glint[2];
      baubleArr[o + 12] = b.size;
    }

    const baubleVAO = gl.createVertexArray();
    const baubleVBO = gl.createBuffer();
    gl.bindVertexArray(baubleVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, baubleVBO);
    gl.bufferData(gl.ARRAY_BUFFER, baubleArr, gl.STATIC_DRAW);
    const BS = 13 * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, BS, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, BS, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, BS, 24);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, BS, 36);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, BS, 48);
    gl.bindVertexArray(null);

    const baubleProg = compileProgram(
      gl,
      `#version 300 es
      layout(location = 0) in vec3 aPos;
      layout(location = 1) in vec3 aBase;
      layout(location = 2) in vec3 aShade;
      layout(location = 3) in vec3 aGlint;
      layout(location = 4) in float aSize;
      uniform mat4 uProj;
      uniform mat4 uView;
      uniform float uAngle;
      uniform float uLightUp;
      uniform float uPixelRatio;
      out vec3 vBase;
      out vec3 vShade;
      out vec3 vGlint;
      out float vAlpha;
      void main() {
        vec3 p = aPos;
        float c = cos(uAngle), s = sin(uAngle);
        p.xz = vec2(p.x * c - p.z * s, p.x * s + p.z * c);
        vec4 viewPos = uView * vec4(p, 1.0);
        gl_Position = uProj * viewPos;
        float dist = max(1.0, -viewPos.z);
        gl_PointSize = clamp(aSize * uPixelRatio * (18.0 / dist), 1.0, 44.0);
        vBase = aBase; vShade = aShade; vGlint = aGlint;
        vAlpha = uLightUp * (0.20 + 0.80 * smoothstep(26.5, 16.5, dist));
      }`,
      `#version 300 es
      precision highp float;
      in vec3 vBase;
      in vec3 vShade;
      in vec3 vGlint;
      in float vAlpha;
      out vec4 fragColor;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        uv.y = -uv.y;
        float r2 = dot(uv, uv);
        if (r2 > 1.0) discard;
        float nz = sqrt(max(0.0, 1.0 - r2));
        vec3 n = vec3(uv, nz);
        vec3 lDir = normalize(vec3(-0.35, 0.55, 0.75));
        float diff = max(0.0, dot(n, lDir));
        vec3 hDir = normalize(lDir + vec3(0.0, 0.0, 1.0));
        float spec = pow(max(0.0, dot(n, hDir)), 32.0);
        float rim = pow(1.0 - nz, 2.8);
        vec3 col = mix(vShade, vBase, 0.22 + 0.78 * diff) + vGlint * (spec * 1.45 + rim * 0.35);
        float edge = smoothstep(1.0, 0.86, sqrt(r2));
        fragColor = vec4(col * vAlpha * edge, vAlpha * edge);
      }`
    );
    const baubleU = getUniforms(gl, baubleProg, ["uProj", "uView", "uAngle", "uLightUp", "uPixelRatio"]);

    return {
      draw(camera, { time, angle, lightUp, pixelRatio }) {
        if (lightUp <= 0.001) return;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(baubleProg);
        gl.uniformMatrix4fv(baubleU.uProj, false, camera.proj);
        gl.uniformMatrix4fv(baubleU.uView, false, camera.view);
        gl.uniform1f(baubleU.uAngle, angle);
        gl.uniform1f(baubleU.uLightUp, lightUp);
        gl.uniform1f(baubleU.uPixelRatio, pixelRatio);
        gl.bindVertexArray(baubleVAO);
        gl.drawArrays(gl.POINTS, 0, baubles.length);
        gl.bindVertexArray(null);

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.useProgram(lightProg);
        gl.uniformMatrix4fv(lightU.uProj, false, camera.proj);
        gl.uniformMatrix4fv(lightU.uView, false, camera.view);
        gl.uniform1f(lightU.uTime, time);
        gl.uniform1f(lightU.uAngle, angle);
        gl.uniform1f(lightU.uLightUp, lightUp);
        gl.uniform1f(lightU.uPixelRatio, pixelRatio);
        gl.bindVertexArray(lightVAO);
        gl.drawArrays(gl.POINTS, 0, lights.length);
        gl.bindVertexArray(null);
      },
    };
  }

  // ------------------------------------------------------------------
  // 5. True Anti-Aliased Glowing Triangle-Strip Spiral Ribbons
  // ------------------------------------------------------------------
  function createRibbons(gl, { turns = 4.5, from = 0.4, to = 10.6, radius = 4.2 } = {}) {
    const segs = 420;
    const buildRibbonMesh = (phaseOffset, radiusPad, halfWidth) => {
      const arr = new Float32Array((segs + 1) * 2 * 5);
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const y = from + (to - from) * u;
        const t = y / to;
        const r = radius * (1.0 - t) * (0.98 + 0.05 * Math.sin(t * Math.PI)) + radiusPad * (1.0 - 0.55 * t);
        const a = u * turns * Math.PI * 2 + phaseOffset;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const hw = halfWidth * (1.0 - 0.45 * t);

        const o0 = i * 10;
        arr[o0 + 0] = x; arr[o0 + 1] = y - hw; arr[o0 + 2] = z; arr[o0 + 3] = u; arr[o0 + 4] = -1.0;
        arr[o0 + 5] = x; arr[o0 + 6] = y + hw; arr[o0 + 7] = z; arr[o0 + 8] = u; arr[o0 + 9] =  1.0;
      }
      const vao = gl.createVertexArray();
      const vbo = gl.createBuffer();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
      gl.bindVertexArray(null);
      return vao;
    };

    const vaos = [
      buildRibbonMesh(0.0, 0.34, 0.055),
      buildRibbonMesh(0.42, 0.16, 0.036),
    ];

    const prog = compileProgram(
      gl,
      `#version 300 es
      layout(location = 0) in vec3 aPos;
      layout(location = 1) in vec2 aMeta;
      uniform mat4 uProj;
      uniform mat4 uView;
      uniform float uAngle;
      uniform float uReveal;
      out float vAlpha;
      out float vEdge;
      out float vU;
      void main() {
        vec3 p = aPos;
        float c = cos(uAngle), s = sin(uAngle);
        p.xz = vec2(p.x * c - p.z * s, p.x * s + p.z * c);
        vec4 viewPos = uView * vec4(p, 1.0);
        gl_Position = uProj * viewPos;
        float front = smoothstep(-5.0, 4.5, viewPos.z + 22.0);
        vAlpha = smoothstep(uReveal, uReveal - 0.06, aMeta.x) * (0.30 + 0.70 * front);
        vEdge = aMeta.y;
        vU = aMeta.x;
      }`,
      `#version 300 es
      precision highp float;
      in float vAlpha;
      in float vEdge;
      in float vU;
      uniform float uBrightness;
      out vec4 fragColor;
      void main() {
        if (vAlpha <= 0.002) discard;
        float profile = exp(-vEdge * vEdge * 5.2) * smoothstep(1.0, 0.75, abs(vEdge));
        vec3 col = mix(vec3(0.86, 0.94, 1.0), vec3(1.0, 0.97, 0.90), vU * 0.45);
        float a = profile * vAlpha * uBrightness;
        fragColor = vec4(col * a, a);
      }`
    );
    const u = getUniforms(gl, prog, ["uProj", "uView", "uAngle", "uReveal", "uBrightness"]);

    return {
      draw(camera, { angle, reveal, brightness = 1.15 }) {
        if (reveal <= 0.001) return;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.useProgram(prog);
        gl.uniformMatrix4fv(u.uProj, false, camera.proj);
        gl.uniformMatrix4fv(u.uView, false, camera.view);
        gl.uniform1f(u.uAngle, angle);
        gl.uniform1f(u.uReveal, reveal);

        gl.uniform1f(u.uBrightness, brightness);
        gl.bindVertexArray(vaos[0]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, (segs + 1) * 2);

        gl.uniform1f(u.uBrightness, brightness * 0.48);
        gl.bindVertexArray(vaos[1]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, (segs + 1) * 2);
        gl.bindVertexArray(null);
      },
    };
  }

  // ------------------------------------------------------------------
  // 6. Smooth Anti-Aliased Comet Ribbon Trail & Sparks
  // ------------------------------------------------------------------
  function createCometSystem(gl, pathFn) {
    const N = 180;
    const trailArr = new Float32Array(N * 2 * 5);
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const p = pathFn(u);
      const hw = 0.055;
      const o = i * 10;
      trailArr[o + 0] = p[0]; trailArr[o + 1] = p[1] - hw; trailArr[o + 2] = p[2]; trailArr[o + 3] = u; trailArr[o + 4] = -1.0;
      trailArr[o + 5] = p[0]; trailArr[o + 6] = p[1] + hw; trailArr[o + 7] = p[2]; trailArr[o + 8] = u; trailArr[o + 9] =  1.0;
    }

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, trailArr, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
    gl.bindVertexArray(null);

    const lineProg = compileProgram(
      gl,
      `#version 300 es
      layout(location = 0) in vec3 aPos;
      layout(location = 1) in vec2 aMeta;
      uniform mat4 uProj;
      uniform mat4 uView;
      uniform float uHead;
      uniform float uFade;
      out float vAlpha;
      out float vEdge;
      void main() {
        gl_Position = uProj * uView * vec4(aPos, 1.0);
        float behind = smoothstep(uHead - 0.58, uHead, aMeta.x) * step(aMeta.x, uHead + 0.004);
        vAlpha = behind * uFade;
        vEdge = aMeta.y;
      }`,
      `#version 300 es
      precision highp float;
      in float vAlpha;
      in float vEdge;
      out vec4 fragColor;
      void main() {
        if (vAlpha <= 0.002) discard;
        float prof = exp(-vEdge * vEdge * 5.0);
        float a = prof * vAlpha * 1.45;
        fragColor = vec4(vec3(0.92, 0.96, 1.0) * a, a);
      }`
    );
    const lineU = getUniforms(gl, lineProg, ["uProj", "uView", "uHead", "uFade"]);

    const sparkCount = 360;
    const sparkArr = new Float32Array(sparkCount * 7);
    let s = 773311;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    for (let i = 0; i < sparkCount; i++) {
      const u = i / sparkCount;
      const p = pathFn(u);
      const o = i * 7;
      sparkArr[o + 0] = p[0] + (rand() - 0.5) * 0.25;
      sparkArr[o + 1] = p[1] + (rand() - 0.5) * 0.25;
      sparkArr[o + 2] = p[2] + (rand() - 0.5) * 0.25;
      sparkArr[o + 3] = (rand() - 0.5) * 1.8;
      sparkArr[o + 4] = -0.3 - rand() * 1.4;
      sparkArr[o + 5] = (rand() - 0.5) * 1.8;
      sparkArr[o + 6] = u;
    }

    const sVAO = gl.createVertexArray();
    const sVBO = gl.createBuffer();
    gl.bindVertexArray(sVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, sVBO);
    gl.bufferData(gl.ARRAY_BUFFER, sparkArr, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
    gl.bindVertexArray(null);

    const sparkProg = compileProgram(
      gl,
      `#version 300 es
      layout(location = 0) in vec3 aPos;
      layout(location = 1) in vec3 aVel;
      layout(location = 2) in float aU;
      uniform mat4 uProj;
      uniform mat4 uView;
      uniform float uHead;
      uniform float uFade;
      uniform float uPixelRatio;
      out float vAlpha;
      void main() {
        float dt = max(0.0, uHead - aU);
        vec3 p = aPos + aVel * dt * 1.1;
        vec4 vp = uView * vec4(p, 1.0);
        gl_Position = uProj * vp;
        float dist = max(1.0, -vp.z);
        float alive = step(aU, uHead) * (1.0 - smoothstep(0.02, 0.52, dt));
        gl_PointSize = clamp(4.6 * uPixelRatio * (18.0 / dist), 1.0, 14.0);
        vAlpha = alive * uFade;
      }`,
      `#version 300 es
      precision highp float;
      in float vAlpha;
      out vec4 fragColor;
      void main() {
        if (vAlpha <= 0.002) discard;
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        float d2 = dot(uv, uv);
        if (d2 > 1.0) discard;
        float inten = exp(-d2 * 6.0) * vAlpha * 1.3;
        fragColor = vec4(vec3(0.95, 0.98, 1.0) * inten, inten);
      }`
    );
    const sparkU = getUniforms(gl, sparkProg, ["uProj", "uView", "uHead", "uFade", "uPixelRatio"]);

    return {
      draw(camera, { headU, fade, pixelRatio }) {
        if (fade <= 0.001) return;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.useProgram(lineProg);
        gl.uniformMatrix4fv(lineU.uProj, false, camera.proj);
        gl.uniformMatrix4fv(lineU.uView, false, camera.view);
        gl.uniform1f(lineU.uHead, headU);
        gl.uniform1f(lineU.uFade, fade);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, N * 2);

        gl.useProgram(sparkProg);
        gl.uniformMatrix4fv(sparkU.uProj, false, camera.proj);
        gl.uniformMatrix4fv(sparkU.uView, false, camera.view);
        gl.uniform1f(sparkU.uHead, headU);
        gl.uniform1f(sparkU.uFade, fade);
        gl.uniform1f(sparkU.uPixelRatio, pixelRatio);
        gl.bindVertexArray(sVAO);
        gl.drawArrays(gl.POINTS, 0, sparkCount);
        gl.bindVertexArray(null);
      },
    };
  }

  window.ChristmasParticles = {
    ParticleField,
    Snowfall,
    Fireworks,
    createPointExtras,
    createRibbons,
    createCometSystem,
  };
})();
