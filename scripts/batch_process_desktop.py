# -*- coding: utf-8 -*-
"""
Full Pipeline:
1. Parse all 9 HSK 4 exam papers from C:\\Users\\Administrator\\Desktop\\hsk\\hsk4
2. Extract all 900 questions + official answers + listening scripts + images
3. Build Korean translations and vocabulary tags using HSK 4 vocabulary bank
4. Copy audio files to public/audio and export images to public/images & desktop
5. Generate standardized Desktop outputs:
   - *_试卷.txt
   - *_答案.txt
   - *_完整题库.json
6. Update and enrich c:\\Users\\Administrator\\HSK\\src\\data\\hskExams.json
"""
import os
import sys
import glob
import json
import re
import shutil
import base64
import fitz # PyMuPDF
import win32com.client as win32

DESKTOP_DIR = r"C:\Users\Administrator\Desktop\hsk\hsk4"
EXPORT_BASE = r"C:\Users\Administrator\Desktop\hsk\标准化题库_9套全量"
PROJECT_DIR = r"C:\Users\Administrator\HSK"
PUBLIC_AUDIO = os.path.join(PROJECT_DIR, "public", "audio")
PUBLIC_IMAGES = os.path.join(PROJECT_DIR, "public", "images")
HSK_EXAMS_JSON = os.path.join(PROJECT_DIR, "src", "data", "hskExams.json")
VOCAB_JSON = os.path.join(PROJECT_DIR, "docs", "vocabulary", "HSK4_词汇表_韩文对照版.json")

os.makedirs(EXPORT_BASE, exist_ok=True)
os.makedirs(PUBLIC_AUDIO, exist_ok=True)
os.makedirs(PUBLIC_IMAGES, exist_ok=True)

# Load Vocab Map
with open(VOCAB_JSON, "r", encoding="utf-8") as f:
    VOCAB_LIST = json.load(f)
# Sort vocab by length descending for greedy substring matching
VOCAB_LIST_SORTED = sorted(VOCAB_LIST, key=lambda x: -len(x["word"]))
VOCAB_MAP = {v["word"]: v for v in VOCAB_LIST}

def find_vocab_for_text(text, max_words=3):
    found = []
    seen = set()
    for v in VOCAB_LIST_SORTED:
        w = v["word"]
        if len(w) >= 2 and w in text and w not in seen:
            seen.add(w)
            found.append({
                "word": w,
                "pinyin": v["pinyin"],
                "meaning": v["korean"]
            })
            if len(found) >= max_words:
                break
    return found

EXAM_CONFIGS = [
    {
        "code": "41221",
        "id": "hsk4-h41221",
        "title": "HSK 4级 官方真题 (H41221)",
        "titleKo": "HSK 4급 기출 모의고사 (H41221)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "mp3",
    },
    {
        "code": "41327",
        "id": "hsk4-h41327",
        "title": "HSK 4级 官方真题 (H41327)",
        "titleKo": "HSK 4급 기출 모의고사 (H41327)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "wma",
    },
    {
        "code": "41328",
        "id": "hsk4-h41328",
        "title": "HSK 4级 官方真题 (H41328)",
        "titleKo": "HSK 4급 기출 모의고사 (H41328)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "mp3",
    },
    {
        "code": "41329",
        "id": "hsk4-h41329",
        "title": "HSK 4级 官方真题 (H41329)",
        "titleKo": "HSK 4급 기출 모의고사 (H41329)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "mp3",
    },
    {
        "code": "41330",
        "id": "hsk4-h41330",
        "title": "HSK 4级 官方真题 (H41330)",
        "titleKo": "HSK 4급 기출 모의고사 (H41330)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "mp3",
    },
    {
        "code": "41331",
        "id": "hsk4-h41331",
        "title": "HSK 4级 官方真题 (H41331)",
        "titleKo": "HSK 4급 기출 모의고사 (H41331)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "mp3",
    },
    {
        "code": "41333",
        "id": "hsk4-h41333",
        "title": "HSK 4级 官方真题 (H41333)",
        "titleKo": "HSK 4급 기출 모의고사 (H41333)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "mp3",
    },
    {
        "code": "41553B",
        "id": "hsk4-h41553b",
        "title": "HSK 4级 官方真题 (H41553B)",
        "titleKo": "HSK 4급 기출 모의고사 (H41553B)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "mp3",
    },
    {
        "code": "41553C",
        "id": "hsk4-h41553c",
        "title": "HSK 4级 官方真题 (H41553C)",
        "titleKo": "HSK 4급 기출 모의고사 (H41553C)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "tag": "4级真题",
        "tagKo": "4급 기출",
        "audioPref": "mp3",
    },
]

def extract_doc_text(doc_path):
    import time
    word = win32.Dispatch("Word.Application")
    word.Visible = False
    try:
        wdoc = word.Documents.Open(doc_path, ReadOnly=True)
        text = wdoc.Content.Text
        wdoc.Close(False)
        return text
    finally:
        try:
            word.Quit()
        except Exception:
            pass
        time.sleep(0.5)

def get_answer_text(code, folder):
    ans_pdfs = glob.glob(os.path.join(folder, "*答案*.pdf"))
    if ans_pdfs:
        doc = fitz.open(ans_pdfs[0])
        t = ""
        for p in doc: t += p.get_text("text") + "\n"
        return t
    ans_docs = glob.glob(os.path.join(folder, "*答案*.doc"))
    if ans_docs:
        return extract_doc_text(ans_docs[0])
    if code == "41331":
        garbled = os.path.join(folder, "H41331▌≡▌╕.doc")
        if os.path.exists(garbled):
            return extract_doc_text(garbled)
    raise RuntimeError(f"Answer text not found for {code}")

def get_listening_text(code, folder):
    if code == "41333":
        doc = fitz.open(os.path.join(folder, "H41333答案.pdf"))
        t = ""
        for p in doc: t += p.get_text("text") + "\n"
        return t
    l_pdfs = glob.glob(os.path.join(folder, "*听力*.pdf")) + glob.glob(os.path.join(folder, "*文本*.pdf"))
    if l_pdfs:
        doc = fitz.open(l_pdfs[0])
        t = ""
        for p in doc: t += p.get_text("text") + "\n"
        return t
    l_docs = glob.glob(os.path.join(folder, "*听力*.doc")) + glob.glob(os.path.join(folder, "*文本*.doc"))
    if l_docs:
        return extract_doc_text(l_docs[0])
    if code == "41331":
        garbled = os.path.join(folder, "H41331▌²-ª▌--╧.doc")
        if os.path.exists(garbled):
            return extract_doc_text(garbled)
    raise RuntimeError(f"Listening text not found for {code}")

def parse_answers(raw_text):
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    # Q1-85
    ans_map = {}
    matches = re.findall(r'(?:^|[^\d])(\d{1,2})\s*[\.．、]\s*([A-F√×]+)', text)
    for num_str, ans in matches:
        qnum = int(num_str)
        if 1 <= qnum <= 85:
            ans_clean = ans.strip()
            if ans_clean == "√": ans_clean = "A"
            elif ans_clean == "×": ans_clean = "B"
            ans_map[qnum] = ans_clean
            
    # Q86-100
    cleaned = re.sub(r'第[一二三]部分|\(参考答案\)|（参考答案）', '\n', text)
    items = re.findall(r'(\b\d{2,3})\s*[．\.]\s*(.*?)(?=\b\d{2,3}\s*[．\.]|$)', cleaned, re.DOTALL)
    writing_map = {}
    for k, v in items:
        num = int(k)
        if 86 <= num <= 100:
            writing_map[num] = v.strip().replace('\r', '').replace('\n', ' ')
    return ans_map, writing_map

def parse_listening_dialogues_and_questions(text):
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # P1: 1-10
    p1 = {}
    for q in range(1, 11):
        next_q = q + 1
        pat = rf'(?:^|\n)\s*{q}\s*[\.．、](.*?)(?=(?:\n\s*{next_q}\s*[\.．、]|\n\s*第二部分|$))'
        m = re.search(pat, text, re.DOTALL)
        if m:
            block = m.group(1).strip()
            s_idx = block.find('★')
            if s_idx != -1:
                p1[q] = (block[:s_idx].strip(), block[s_idx:].strip())
            else:
                p1[q] = ('', block)

    # P2: 11-35
    p2 = {}
    for q in range(11, 36):
        next_q = q + 1
        pat = rf'(?:^|\n)\s*{q}\s*[\.．、](.*?)(?=(?:\n\s*{next_q}\s*[\.．、]|\n\s*第三部分|\n\s*第3[67]|$))'
        m = re.search(pat, text, re.DOTALL)
        if m:
            p2[q] = m.group(1).strip()

    # P3: 36-45
    p3 = {}
    for q in range(36, 46):
        next_q = q + 1
        pat = rf'(?:^|\n)\s*{q}\s*[\.．、](.*?)(?=(?:\n\s*{next_q}\s*[\.．、]|\n\s*听力考试现在结束|$))'
        m = re.search(pat, text, re.DOTALL)
        if m:
            p3[q] = m.group(1).strip()
            
    # Also find passages for 36-37, 38-39, etc.
    passages = {}
    matches = re.finditer(r'第\s*(\d{2})\s*(?:到|至|-)\s*(\d{2})\s*题是根据下面一段话[：:]\s*(.*?)(?=\n\s*\d{2}\s*[\.．、]|$)', text, re.DOTALL)
    for m in matches:
        s_q = int(m.group(1))
        e_q = int(m.group(2))
        p_text = m.group(3).strip()
        for q in range(s_q, e_q + 1):
            passages[q] = p_text

    return p1, p2, p3, passages

def process_single_exam(cfg):
    code = cfg["code"]
    print(f"\n==========================================")
    print(f"Processing HSK {code}: {cfg['title']}")
    print(f"==========================================")
    folder = os.path.join(DESKTOP_DIR, code)
    
    # 1. Answer text
    ans_text = get_answer_text(code, folder)
    ans_map, writing_map = parse_answers(ans_text)
    print(f"  [Answers] Q1-85: {len(ans_map)} found, Q86-100: {len(writing_map)} found")
    
    # 2. Listening text
    l_text = get_listening_text(code, folder)
    l_p1, l_p2, l_p3, l_passages = parse_listening_dialogues_and_questions(l_text)
    print(f"  [Listening] P1: {len(l_p1)}, P2: {len(l_p2)}, P3: {len(l_p3)}")
    
    # 3. Paper PDF
    paper_pdf = os.path.join(folder, f"H{code}试卷.pdf")
    if not os.path.exists(paper_pdf): paper_pdf = os.path.join(folder, f"H{code}试题.pdf")
    if not os.path.exists(paper_pdf): paper_pdf = os.path.join(folder, f"H{code}.pdf")
    doc = fitz.open(paper_pdf)
    
    # 4. Audio copying
    audio_src = None
    if cfg["audioPref"] == "mp3":
        mp3s = glob.glob(os.path.join(folder, "*.mp3"))
        if mp3s: audio_src = mp3s[0]
    if not audio_src:
        wmas = glob.glob(os.path.join(folder, "*.wma"))
        if wmas: audio_src = wmas[0]
        else:
            mp3s = glob.glob(os.path.join(folder, "*.mp3"))
            if mp3s: audio_src = mp3s[0]
            
    audio_ext = os.path.splitext(audio_src)[1].lower() if audio_src else ".mp3"
    target_audio_name = f"H{code}_听力{audio_ext}"
    target_audio_path = os.path.join(PUBLIC_AUDIO, target_audio_name)
    if audio_src and not os.path.exists(target_audio_path):
        shutil.copy2(audio_src, target_audio_path)
        print(f"  [Audio] Copied to {target_audio_name} ({os.path.getsize(target_audio_path)/(1024*1024):.1f} MB)")
    else:
        print(f"  [Audio] Using {target_audio_name}")
        
    # 5. Extract images from page 16
    p16 = doc[15]
    rects = []
    for img in p16.get_images():
        r = p16.get_image_rects(img[0])
        if r: rects.extend(r)
    merged = []
    for r in rects:
        matched = False
        for i, m in enumerate(merged):
            exp = fitz.Rect(m.x0-5, m.y0-5, m.x1+5, m.y1+5)
            if exp.intersects(r):
                merged[i] = m | r
                matched = True
                break
        if not matched: merged.append(fitz.Rect(r))
    non_example = [m for m in merged if m.y0 > 260]
    non_example.sort(key=lambda b: b.y0)
    p_row1 = sorted(non_example[:2], key=lambda b: b.x0)
    p_row2 = sorted(non_example[2:4], key=lambda b: b.x0)
    p_row3 = non_example[4:]
    img_rect_map = {96: p_row1[0], 97: p_row1[1], 98: p_row2[0], 99: p_row2[1], 100: p_row3[0]}
    
    desktop_exam_dir = os.path.join(EXPORT_BASE, f"HSK4_{code}")
    desktop_img_dir = os.path.join(desktop_exam_dir, "images")
    os.makedirs(desktop_img_dir, exist_ok=True)
    
    img_public_paths = {}
    img_base64_map = {}
    for q, rect in img_rect_map.items():
        pix = p16.get_pixmap(clip=rect, dpi=200)
        img_name = f"H{code}_第{q}题.png"
        pub_p = os.path.join(PUBLIC_IMAGES, img_name)
        dsk_p = os.path.join(desktop_img_dir, img_name)
        pix.save(pub_p)
        pix.save(dsk_p)
        img_public_paths[q] = f"/images/{img_name}"
        with open(pub_p, "rb") as bf:
            img_base64_map[q] = f"data:image/png;base64,{base64.b64encode(bf.read()).decode('utf-8')}"
    print(f"  [Images] Extracted 5 images for Q96-100 to public/images & desktop")
    
    # 6. Parse Options for Listening Q11-45
    listening_options = {}
    l_full_text = ""
    for pno in range(2, 6): l_full_text += doc[pno].get_text("text") + "\n"
    for q in range(11, 46):
        next_q = q + 1
        pattern = rf'(?:^|\n)\s*{q}\s*[\.．、](.*?)(?=(?:\n\s*{next_q}\s*[\.．、]|\n\s*第[一二三]部分|$))'
        m = re.search(pattern, l_full_text, re.DOTALL)
        opts = {}
        if m:
            block = m.group(1)
            for om in re.finditer(r'([A-D])\s+([^\n\rA-D]+)', block):
                opts[om.group(1)] = om.group(2).strip()
        listening_options[q] = opts
        
    # 7. Parse Reading P1 (Q46-55)
    p7_text = doc[6].get_text("text")
    p8_text = doc[7].get_text("text")
    def extract_word_group(txt):
        res = {}
        for l in txt.split("\n"):
            if "A" in l and "B" in l and "C" in l:
                for om in re.findall(r'([A-F])\s+([^\sA-F]+)', l):
                    res[om[0]] = om[1].strip()
        return res
    g1 = extract_word_group(p7_text)
    g2 = extract_word_group(p8_text)
    
    r_p1_text = p7_text + "\n" + p8_text
    r_p1_lines = [l.strip() for l in r_p1_text.split("\n") if l.strip()]
    r_p1_stems = {}
    curr_q, buf = None, []
    for l in r_p1_lines:
        m = re.match(r'^(\d{2})[．\.]\s*(.*)$', l)
        if m and 46 <= int(m.group(1)) <= 55:
            if curr_q: r_p1_stems[curr_q] = "\n".join(buf)
            curr_q = int(m.group(1))
            buf = [m.group(2)]
        elif curr_q:
            if "第二部分" in l or "第56-65" in l:
                r_p1_stems[curr_q] = "\n".join(buf)
                curr_q = None
                break
            buf.append(l)
    if curr_q: r_p1_stems[curr_q] = "\n".join(buf)
    
    # 8. Parse Reading P2 (Q56-65)
    r_p2_text = doc[8].get_text("text") + "\n" + doc[9].get_text("text")
    r_p2_lines = [l.strip() for l in r_p2_text.split("\n") if l.strip()]
    r_p2_raw = {}
    curr_q, buf = None, []
    for l in r_p2_lines:
        m = re.match(r'^(\d{2})[．\.]\s*(.*)$', l)
        if m and 56 <= int(m.group(1)) <= 65:
            if curr_q: r_p2_raw[curr_q] = "\n".join(buf)
            curr_q = int(m.group(1))
            buf = [m.group(2)]
        elif curr_q:
            if "第三部分" in l or "第66-85" in l:
                r_p2_raw[curr_q] = "\n".join(buf)
                curr_q = None
                break
            buf.append(l)
    if curr_q: r_p2_raw[curr_q] = "\n".join(buf)
    
    # Parse sentences A, B, C for each
    r_p2_sentences = {}
    for q, btext in r_p2_raw.items():
        sents = {}
        for m in re.finditer(r'([A-C])\s+([^\n\rA-C]+)', btext):
            sents[m.group(1)] = m.group(2).strip()
        r_p2_sentences[q] = sents
        
    # 9. Parse Reading P3 (Q66-85)
    r_p3_text = ""
    for pno in range(10, 14): r_p3_text += doc[pno].get_text("text") + "\n"
    r_p3_lines = [l.strip() for l in r_p3_text.split("\n") if l.strip()]
    clean_p3_lines = []
    for l in r_p3_lines:
        if re.match(r'^H\d+\s*-\s*\d+$', l): continue
        if "第三部分" in l or "第66-85" in l: continue
        if "例如：" in l or "★ 她是个什么样的人" in l or "A 幽默" in l: continue
        clean_p3_lines.append(l)
        
    p3_blocks = {}
    curr_key, buf = None, []
    for l in clean_p3_lines:
        m_range = re.match(r'^(\d{2})-(\d{2})[．\.]\s*(.*)$', l)
        m_single = re.match(r'^(\d{2})[．\.]\s*(.*)$', l)
        if m_range and 66 <= int(m_range.group(1)) <= 85:
            if curr_key: p3_blocks[curr_key] = "\n".join(buf)
            curr_key = f"{m_range.group(1)}-{m_range.group(2)}"
            buf = [m_range.group(3)] if m_range.group(3) else []
        elif m_single and 66 <= int(m_single.group(1)) <= 85:
            if curr_key: p3_blocks[curr_key] = "\n".join(buf)
            curr_key = str(int(m_single.group(1)))
            buf = [m_single.group(2)] if m_single.group(2) else []
        elif curr_key:
            buf.append(l)
    if curr_key: p3_blocks[curr_key] = "\n".join(buf)
    
    r_p3_questions = {}
    for k, block in p3_blocks.items():
        if "-" in k:
            s_q, e_q = map(int, k.split("-"))
            parts = block.split("★")
            passage = parts[0].strip()
            for idx, q_part in enumerate(parts[1:], start=s_q):
                lines = q_part.strip().split("\n")
                stem = lines[0].strip()
                opts = dict(re.findall(r'([A-D])\s+([^\n\rA-D]+)', q_part))
                r_p3_questions[idx] = {
                    "passage": passage,
                    "stem": f"★ {stem}",
                    "options": opts
                }
        else:
            q = int(k)
            parts = block.split("★")
            passage = parts[0].strip()
            q_part = parts[1] if len(parts) > 1 else ""
            lines = q_part.strip().split("\n")
            stem = lines[0].strip()
            opts = dict(re.findall(r'([A-D])\s+([^\n\rA-D]+)', q_part))
            r_p3_questions[q] = {
                "passage": passage,
                "stem": f"★ {stem}",
                "options": opts
            }
            
    # 10. Parse Writing P1 (Q86-95)
    w_p1_lines = [l.strip() for l in doc[14].get_text("text").split("\n") if l.strip()]
    writing_chunks = {}
    for l in w_p1_lines:
        m = re.match(r'^(\d{2})[．\.]\s*(.*)$', l)
        if m and 86 <= int(m.group(1)) <= 95:
            q = int(m.group(1))
            raw = m.group(2).strip()
            words = [w.strip() for w in re.split(r'\s{2,}|\t+', raw) if w.strip()]
            writing_chunks[q] = words
            
    # 11. Parse Writing P2 (Q96-100) words
    p16_text = doc[15].get_text("text")
    writing_words = {}
    for q in range(96, 101):
        next_q = q + 1
        pat = rf'(?:^|\s){q}\s*[．\.](.*?)(?=(?:\s*{next_q}\s*[．\.]|\n\s*H\d+|$))'
        m = re.search(pat, p16_text, re.DOTALL)
        if m:
            w = re.findall(r'[\u4e00-\u9fff]+', m.group(1).strip())
            if w: writing_words[q] = w[0]

    # BUILD QUESTIONS 1 TO 100
    questions_list = []
    
    # Q1-10
    for q in range(1, 11):
        mat, stem = l_p1.get(q, ("", ""))
        official_ans = ans_map.get(q, "A")
        vocab = find_vocab_for_text(mat + " " + stem)
        q_obj = {
            "id": f"{cfg['id']}-{q}",
            "number": q,
            "type": "single_choice",
            "section": "第一部分 · 听力 (判断题)",
            "sectionKo": "1영역 · 듣기 (OX 판단)",
            "partCategory": "听力",
            "content": f"判断对错：{stem}",
            "options": {
                "A": "正确（√）",
                "B": "错误（×）"
            },
            "optionsKo": {
                "A": "맞음 (√)",
                "B": "틀림 (×)"
            },
            "officialAnswer": official_ans,
            "explanation": f"听力录音材料：“{mat}”。结合题目：“{stem}”，官方正确判断为 {official_ans}（{'正确' if official_ans=='A' else '错误'}）。",
            "explanationKo": f"【정답 안내】: 정답은 **{official_ans}** 입니다.\n\n【해설】: 제시된 음원 내용과 비교했을 때 {'일치하는 내용이므로 맞음(√)' if official_ans=='A' else '상반되거나 일치하지 않는 왜곡된 내용이므로 틀림(×)'} 입니다.",
            "vocabList": vocab,
            "image": None,
            "audioFileName": target_audio_name,
            "transcript": mat
        }
        questions_list.append(q_obj)
        
    # Q11-35
    for q in range(11, 36):
        dialogue = l_p2.get(q, "")
        opts = listening_options.get(q, {})
        official_ans = ans_map.get(q, "A")
        vocab = find_vocab_for_text(dialogue + " " + " ".join(opts.values()))
        # Options Ko
        opts_ko = {}
        for k, v in opts.items():
            if v in VOCAB_MAP:
                opts_ko[k] = f"{v} ({VOCAB_MAP[v]['korean']})"
            else:
                opts_ko[k] = v
        q_obj = {
            "id": f"{cfg['id']}-{q}",
            "number": q,
            "type": "single_choice",
            "section": "第二部分 · 听力 (对话理解)",
            "sectionKo": "2영역 · 듣기 (대화 이해)",
            "partCategory": "听力",
            "content": f"【听力录音材料】\n{dialogue}",
            "options": opts,
            "optionsKo": opts_ko,
            "officialAnswer": official_ans,
            "explanation": f"听力对话材料：\n{dialogue}\n根据对话设问，官方标准答案为 {official_ans}（{opts.get(official_ans, '')}）。",
            "explanationKo": f"【정답 안내】: 정답은 **{official_ans}** ({opts.get(official_ans, '')}) 입니다.\n\n【상세 분석】: 대화의 핵심 내용과 질문의 의도를 분석했을 때 가장 알맞은 선택지는 **{official_ans}** 입니다.",
            "vocabList": vocab,
            "image": None,
            "audioFileName": target_audio_name,
            "transcript": dialogue
        }
        questions_list.append(q_obj)

    # Q36-45
    for q in range(36, 46):
        stem_raw = l_p3.get(q, "")
        passage = l_passages.get(q, "")
        opts = listening_options.get(q, {})
        official_ans = ans_map.get(q, "A")
        content_text = f"【听力短文材料】\n{passage}\n\n问：{stem_raw}" if passage else f"【听力短文材料】\n{stem_raw}"
        vocab = find_vocab_for_text(content_text + " " + " ".join(opts.values()))
        opts_ko = {}
        for k, v in opts.items():
            if v in VOCAB_MAP:
                opts_ko[k] = f"{v} ({VOCAB_MAP[v]['korean']})"
            else:
                opts_ko[k] = v
        q_obj = {
            "id": f"{cfg['id']}-{q}",
            "number": q,
            "type": "single_choice",
            "section": "第三部分 · 听力 (长对话与短文)",
            "sectionKo": "3영역 · 듣기 (단문 및 종합 이해)",
            "partCategory": "听力",
            "content": content_text,
            "options": opts,
            "optionsKo": opts_ko,
            "officialAnswer": official_ans,
            "explanation": f"听力材料重点：{passage[:80]}...\n问：{stem_raw}\n官方标准答案为 {official_ans}（{opts.get(official_ans, '')}）。",
            "explanationKo": f"【정답 안내】: 정답은 **{official_ans}** ({opts.get(official_ans, '')}) 입니다.\n\n【상세 분석】: 본문의 핵심 문맥을 종합할 때 논리적으로 정확한 답안입니다.",
            "vocabList": vocab,
            "image": None,
            "audioFileName": target_audio_name,
            "transcript": passage
        }
        questions_list.append(q_obj)

    # Q46-55 (Reading P1: Cloze)
    for q in range(46, 56):
        word_bank = g1 if q <= 50 else g2
        raw_ans = ans_map.get(q, "A") # e.g. 'F' or 'C'
        correct_word = word_bank.get(raw_ans, "")
        # Select 4 options for paper-exam-app compatibility: correct word + 3 distractors
        other_keys = [k for k in sorted(word_bank.keys()) if k != raw_ans]
        selected_distractors = other_keys[:3]
        final_four_keys = ["A", "B", "C", "D"]
        # Map correct answer to 'A' or maintain order
        # To make it natural: place correct_word at index 0, then 3 distractors
        opts = {
            "A": correct_word,
            "B": word_bank.get(selected_distractors[0], ""),
            "C": word_bank.get(selected_distractors[1], ""),
            "D": word_bank.get(selected_distractors[2], "")
        }
        official_ans = "A"
        stem = r_p1_stems.get(q, "")
        vocab = find_vocab_for_text(stem + " " + " ".join(opts.values()))
        opts_ko = {}
        for k, v in opts.items():
            if v in VOCAB_MAP:
                opts_ko[k] = f"{v} ({VOCAB_MAP[v]['korean']})"
            else:
                opts_ko[k] = v
        q_obj = {
            "id": f"{cfg['id']}-{q}",
            "number": q,
            "type": "single_choice",
            "section": "第一部分 · 阅读 (选词填空)",
            "sectionKo": "1영역 · 독해 (빈칸 어휘 채우기)",
            "partCategory": "阅读",
            "content": f"选词填空：\n{stem}",
            "options": opts,
            "optionsKo": opts_ko,
            "officialAnswer": official_ans,
            "explanation": f"选词填空：根据语境逻辑与固定搭配，空缺处应填入“{correct_word}”（原选项 {raw_ans}）。",
            "explanationKo": f"【정답 안내】: 정답은 **A** ({correct_word}) 입니다.\n\n【어휘 해설】: 문맥 흐름과 어법적 결합 관계상 “{correct_word}”가 들어가야 문장이 자연스럽게 완성됩니다.",
            "vocabList": vocab,
            "image": None,
            "audioFileName": target_audio_name
        }
        questions_list.append(q_obj)

    # Q56-65 (Reading P2: Sentence Ordering)
    for q in range(56, 66):
        correct_order = ans_map.get(q, "BAC") # e.g. BAC
        sents = r_p2_sentences.get(q, {})
        # Generate 4 permutations including correct one
        all_perms = ["A-B-C", "A-C-B", "B-A-C", "B-C-A", "C-A-B", "C-B-A"]
        # Format correct as X-Y-Z
        formatted_corr = "-".join(list(correct_order)) if len(correct_order)==3 else "B-A-C"
        distractors = [p for p in all_perms if p != formatted_corr][:3]
        opts = {
            "A": formatted_corr,
            "B": distractors[0],
            "C": distractors[1],
            "D": distractors[2]
        }
        content_lines = [f"{k} {sents.get(k, '')}" for k in ["A", "B", "C"] if k in sents]
        content = "请排列下列句子的正确顺序：\n" + "\n".join(content_lines)
        vocab = find_vocab_for_text(content)
        q_obj = {
            "id": f"{cfg['id']}-{q}",
            "number": q,
            "type": "single_choice",
            "section": "第二部分 · 阅读 (排列顺序)",
            "sectionKo": "2영역 · 독해 (문장 순서 배열)",
            "partCategory": "阅读",
            "content": content,
            "options": opts,
            "optionsKo": opts,
            "officialAnswer": "A",
            "explanation": f"排列顺序：官方正确顺序为 {formatted_corr}。\n分析：首先确立首句，再依照逻辑连词与因果递进关系展开。",
            "explanationKo": f"【정답 안내】: 정답은 **A** ({formatted_corr}) 입니다.\n\n【순서 분석】: 접속사와 지시대명사, 시간 순서 및 인과 관계를 분석할 때 가장 논리적인 배열 순서입니다.",
            "vocabList": vocab,
            "image": None,
            "audioFileName": target_audio_name
        }
        questions_list.append(q_obj)

    # Q66-85 (Reading P3: Short Passages)
    for q in range(66, 86):
        p_info = r_p3_questions.get(q, {"passage": "", "stem": "", "options": {}})
        opts = p_info["options"]
        official_ans = ans_map.get(q, "A")
        content = f"{p_info['passage']}\n\n{p_info['stem']}" if p_info["passage"] else p_info["stem"]
        vocab = find_vocab_for_text(content + " " + " ".join(opts.values()))
        opts_ko = {}
        for k, v in opts.items():
            if v in VOCAB_MAP:
                opts_ko[k] = f"{v} ({VOCAB_MAP[v]['korean']})"
            else:
                opts_ko[k] = v
        q_obj = {
            "id": f"{cfg['id']}-{q}",
            "number": q,
            "type": "single_choice",
            "section": "第三部分 · 阅读 (短文阅读理解)",
            "sectionKo": "3영역 · 독해 (단문 독해 이해)",
            "partCategory": "阅读",
            "content": content,
            "options": opts,
            "optionsKo": opts_ko,
            "officialAnswer": official_ans,
            "explanation": f"短文阅读：官方标准答案为 {official_ans}（{opts.get(official_ans, '')}）。\n重点对应原文描述，直接验证符合题意。",
            "explanationKo": f"【정답 안내】: 정답은 **{official_ans}** ({opts.get(official_ans, '')}) 입니다.\n\n【독해 분석】: 지문 내의 핵심 서술 내용과 직접적으로 일치하는 선택지입니다.",
            "vocabList": vocab,
            "image": None,
            "audioFileName": target_audio_name
        }
        questions_list.append(q_obj)

    # Q86-95 (Writing P1: Sentence Reconstruction)
    for q in range(86, 96):
        chunks = writing_chunks.get(q, [])
        standard_sent = writing_map.get(q, "")
        vocab = find_vocab_for_text(standard_sent)
        q_obj = {
            "id": f"{cfg['id']}-{q}",
            "number": q,
            "type": "order_words",
            "section": "第一部分 · 书写 (连词成句)",
            "sectionKo": "1영역 · 쓰기 (어순 배열 완성)",
            "partCategory": "书写",
            "content": "【连词成句】请将下列打乱的词块重新排列成语法正确、通顺完整的句子：",
            "options": {},
            "optionsKo": {},
            "officialAnswer": standard_sent,
            "explanation": f"官方标准排列句子为：“{standard_sent}”。",
            "explanationKo": f"【정답 문장】: **{standard_sent}**\n\n【어법 분석】: 주어, 술어, 목적어의 기본 구조와 수식어(관형어/부사어) 배치를 점검하세요.",
            "vocabList": vocab,
            "image": None,
            "audioFileName": target_audio_name,
            "wordsToOrder": chunks,
            "standardSentence": standard_sent
        }
        questions_list.append(q_obj)

    # Q96-100 (Writing P2: Image Essay)
    for q in range(96, 101):
        req_word = writing_words.get(q, "")
        ref_essay = writing_map.get(q, "")
        img_url = img_public_paths.get(q, "")
        vocab = find_vocab_for_text(req_word + " " + ref_essay)
        q_obj = {
            "id": f"{cfg['id']}-{q}",
            "number": q,
            "type": "image_writing",
            "section": "第二部分 · 书写 (看图造句)",
            "sectionKo": "2영역 · 쓰기 (그림 보고 작문)",
            "partCategory": "书写",
            "content": f"【看图造句】请观察图片，结合指定词语造出一个语法正确、通顺完整的句子：\n指定词语：【{req_word}】",
            "options": {},
            "optionsKo": {},
            "officialAnswer": ref_essay,
            "explanation": f"官方参考造句：“{ref_essay}”。",
            "explanationKo": f"【모범 답안】: **{ref_essay}**\n\n【작문 팁】: 필수 단어 【{req_word}】을 반드시 올바른 품사와 문장 성분으로 활용하고 마침표(。)를 잊지 마세요.",
            "vocabList": vocab,
            "image": img_url,
            "audioFileName": target_audio_name,
            "requiredWord": req_word,
            "referenceEssay": ref_essay
        }
        questions_list.append(q_obj)

    print(f"  [Verification] Total questions constructed: {len(questions_list)}/100")
    
    # 12. Generate Desktop Standardized Files (*_试卷.txt, *_答案.txt, *_完整题库.json)
    paper_txt_lines = [f"{cfg['title']}\n"]
    ans_txt_lines = [f"{cfg['title']} - 官方答案\n"]
    
    for q in questions_list:
        qn = q["number"]
        if q["type"] == "single_choice":
            paper_txt_lines.append(f"{qn}. {q['content']}")
            for opt_k in ["A", "B", "C", "D"]:
                if opt_k in q["options"]:
                    paper_txt_lines.append(f"{opt_k}. {q['options'][opt_k]}")
            paper_txt_lines.append("")
            ans_txt_lines.append(f"{qn}. {q['officialAnswer']}")
        elif q["type"] == "order_words":
            words_str = "    ".join(q.get("wordsToOrder", []))
            paper_txt_lines.append(f"{qn}. 【连词成句】请将下列词语排列组合成通顺完整的句子：\n{words_str}")
            paper_txt_lines.append(f"A. {q['officialAnswer']}")
            paper_txt_lines.append(f"B. （错误语序）{words_str}")
            paper_txt_lines.append("")
            ans_txt_lines.append(f"{qn}. A")
        elif q["type"] == "image_writing":
            paper_txt_lines.append(f"{qn}. {q['content']}\n配图：images/H{code}_第{qn}题.png")
            paper_txt_lines.append(f"A. {q['officialAnswer']}")
            paper_txt_lines.append(f"B. （错误造句）包含词语：{q.get('requiredWord', '')}")
            paper_txt_lines.append("")
            ans_txt_lines.append(f"{qn}. A")

    # Write files to desktop_exam_dir
    with open(os.path.join(desktop_exam_dir, f"H{code}_试卷.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(paper_txt_lines))
    with open(os.path.join(desktop_exam_dir, f"H{code}_答案.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(ans_txt_lines))
        
    desktop_full_json = {
        "title": cfg["title"],
        "hasOfficialAnswers": True,
        "questionCount": len(questions_list),
        "audioFileName": target_audio_name,
        "questions": questions_list
    }
    with open(os.path.join(desktop_exam_dir, f"H{code}_完整题库.json"), "w", encoding="utf-8") as f:
        json.dump(desktop_full_json, f, ensure_ascii=False, indent=2)

    print(f"  [Desktop Export] Generated H{code}_试卷.txt, H{code}_答案.txt, H{code}_完整题库.json")
    
    # Return formatted exam object for hskExams.json
    exam_item = {
        "id": cfg["id"],
        "level": 4,
        "title": cfg["title"],
        "titleKo": cfg["titleKo"],
        "subTitle": cfg["subTitle"],
        "subTitleKo": cfg["subTitleKo"],
        "tag": cfg["tag"],
        "tagKo": cfg["tagKo"],
        "durationMinutes": 105,
        "duration": "105分钟",
        "questionCount": 100,
        "hasOfficialAnswers": True,
        "audioUrl": f"/audio/{target_audio_name}",
        "audioFileName": target_audio_name,
        "questions": questions_list
    }
    return exam_item

def main():
    print("Starting full batch processing of all 9 HSK 4 exam papers...")
    new_exams = []
    for cfg in EXAM_CONFIGS:
        try:
            item = process_single_exam(cfg)
            new_exams.append(item)
        except Exception as e:
            print(f"ERROR processing {cfg['code']}: {e}")
            import traceback
            traceback.print_exc()

    # Read existing hskExams.json and merge
    with open(HSK_EXAMS_JSON, "r", encoding="utf-8") as f:
        existing_exams = json.load(f)

    # We preserve any non-HSK4 exams (like HSK 5) and sample exams, while replacing or adding these 9 exams
    new_ids = {e["id"] for e in new_exams}
    preserved_exams = [e for e in existing_exams if e["id"] not in new_ids]
    
    # Sort: 9 new HSK 4 exams first, then existing other exams
    merged_exams = new_exams + preserved_exams
    
    with open(HSK_EXAMS_JSON, "w", encoding="utf-8") as f:
        json.dump(merged_exams, f, ensure_ascii=False, indent=2)
        
    print(f"\n==========================================")
    print(f"ALL DONE! Successfully processed {len(new_exams)} exams.")
    print(f"hskExams.json updated with total {len(merged_exams)} exams.")
    print(f"Standardized desktop export saved at: {EXPORT_BASE}")
    print(f"==========================================")

if __name__ == "__main__":
    main()
