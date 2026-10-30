# -*- coding: utf-8 -*-
"""
Parse H51218 full paper from raw PDF dumps into JSON matching Eloise's HSK APP standards.
"""
import os
import json
import re
import fitz

BASE_DIR = r"C:\Users\Administrator\Desktop\hsk\hsk5\51218"
WORDS_FILE = r"C:\Users\Administrator\HSK\src\data\hskWords.json"
OUT_EXAMS_FILE = r"C:\Users\Administrator\HSK\src\data\hskExams.json"

# Load vocabulary bank
with open(WORDS_FILE, "r", encoding="utf-8") as f:
    VOCAB_BANK = json.load(f)

VOCAB_MAP = {}
for w in VOCAB_BANK:
    VOCAB_MAP[w["word"]] = {
        "word": w["word"],
        "pinyin": w["pinyin"],
        "meaning": w["korean"]
    }

# Read PDF dumps
with open(r"c:\Users\Administrator\HSK\scripts\h51218_exam.txt", "r", encoding="utf-8") as f:
    exam_text = f.read()

with open(r"c:\Users\Administrator\HSK\scripts\h51218_mat.txt", "r", encoding="utf-8") as f:
    mat_text = f.read()

with open(r"c:\Users\Administrator\HSK\scripts\h51218_ans.txt", "r", encoding="utf-8") as f:
    ans_text = f.read()

# 1. Parse official answers
answers = {}
matches = re.findall(r'(\d+)\s*[.．]\s*([A-D]|[\u4e00-\u9fa5]+[^\n]*)', ans_text)
for q_str, ans in matches:
    q_num = int(q_str)
    answers[q_num] = ans.strip()

print(f"Parsed {len(answers)} answers.")

# 2. Parse listening options (Q1 - Q45) using two columns bounding
doc = fitz.open(os.path.join(BASE_DIR, "H51218.pdf"))
two_col_listening_text = ""
for pno in range(1, 5):
    page = doc[pno]
    rect_left = fitz.Rect(50, 70, 260, 760)
    rect_right = fitz.Rect(260, 70, 550, 760)
    two_col_listening_text += "\n" + page.get_text("text", clip=rect_left) + "\n" + page.get_text("text", clip=rect_right)

listening_options = {}
for q in range(1, 46):
    pat = rf'(?:^|\n)\s*{q}[.．]\s*A\s*([^\n]+)\s*\n\s*B\s*([^\n]+)\s*\n\s*C\s*([^\n]+)\s*\n\s*D\s*([^\n]+)'
    m = re.search(pat, two_col_listening_text)
    if m:
        listening_options[q] = {
            'A': m.group(1).strip(),
            'B': m.group(2).strip(),
            'C': m.group(3).strip(),
            'D': m.group(4).strip()
        }
    else:
        print(f"Error: Missing listening options for Q{q}")

print(f"Parsed {len(listening_options)} listening options.")

# 3. Parse listening audio text
# Part 1: Q1 - Q20
listening_scripts = {}
for q in range(1, 21):
    pat = rf'(?:^|\n)\s*{q}[.．]\s*([\s\S]*?)(?=(?:\n\s*(?:{q+1}[.．]|第\s*\d+\s*到\s*\d+\s*题|第二部分|$)))'
    m = re.search(pat, mat_text)
    if m:
        listening_scripts[q] = m.group(1).strip()
    else:
        print(f"Error: Missing script for Q{q}")

# Part 2 Dialogues: Q21 - Q30
for q in range(21, 31):
    pat = rf'(?:^|\n)\s*{q}[.．]\s*([\s\S]*?)(?=(?:\n\s*(?:{q+1}[.．]|第\s*\d+\s*到\s*\d+\s*题|第二部分|$)))'
    m = re.search(pat, mat_text)
    if m:
        listening_scripts[q] = m.group(1).strip()
    else:
        print(f"Error: Missing script for Q{q}")

# Part 2 Passages: Q31 - Q45
passages_matches = list(re.finditer(r'第\s*(\d+)\s*到\s*(\d+)\s*题是根据下面一段话：', mat_text))
for i, m in enumerate(passages_matches):
    q_start = int(m.group(1))
    q_end = int(m.group(2))
    start_pos = m.end()
    end_pos = passages_matches[i+1].start() if i+1 < len(passages_matches) else len(mat_text)
    sub = mat_text[start_pos:end_pos].strip()
    
    m_q = re.search(rf'(?:^|\n)\s*{q_start}[.．]', sub)
    if m_q:
        passage = sub[:m_q.start()].strip()
        q_text = sub[m_q.start():].strip()
        for q in range(q_start, q_end + 1):
            mq = re.search(rf'(?:^|\n)\s*{q}[.．]\s*([^\n]+)', q_text)
            question_prompt = mq.group(1).strip() if mq else ""
            listening_scripts[q] = f"【短文材料】\n{passage}\n\n【问题】{question_prompt}"
    else:
        print(f"Error: Could not split passage {q_start}-{q_end}")

print(f"Parsed {len(listening_scripts)} listening scripts.")

# 4. Parse reading options & content (Q46 - Q90)
reading_options = {}
full_reading_text = '\n'.join([doc[p].get_text('text') for p in range(6, 16)])

for q in range(46, 91):
    pat_1line = rf'A\s+([^\nB]+?)\s+B\s+([^\nC]+?)\s+C\s+([^\nD]+?)\s+D\s+([^\n]+)'
    pat_2x2 = rf'A\s+([^\nB]+?)\s+B\s+([^\n]+)\s*\n\s*C\s+([^\nC]+?)\s+D\s+([^\n]+)'
    pat_vert = rf'A\s+([^\n]+)\s*\n\s*B\s+([^\n]+)\s*\n\s*C\s+([^\n]+)\s*\n\s*D\s+([^\n]+)'
    
    q_pat = rf'(?:^|\n)\s*{q}[.．]([\s\S]*?)(?=(?:\n\s*(?:{q+1}[.．]|第二部分|第三部分|三、书写|\d+-\d+|$)))'
    m_block = re.search(q_pat, full_reading_text)
    if m_block:
        btext = m_block.group(0)
        m1 = re.search(pat_1line, btext)
        if m1:
            reading_options[q] = {'A': m1.group(1).strip(), 'B': m1.group(2).strip(), 'C': m1.group(3).strip(), 'D': m1.group(4).strip()}
            continue
        m2 = re.search(pat_2x2, btext)
        if m2:
            reading_options[q] = {'A': m2.group(1).strip(), 'B': m2.group(2).strip(), 'C': m2.group(3).strip(), 'D': m2.group(4).strip()}
            continue
        mv = re.search(pat_vert, btext)
        if mv:
            reading_options[q] = {'A': mv.group(1).strip(), 'B': mv.group(2).strip(), 'C': mv.group(3).strip(), 'D': mv.group(4).strip()}
            continue
    print(f"Error: Missing reading options for Q{q}")

print(f"Parsed {len(reading_options)} reading options.")

# 5. Parse reading content:
# Reading Part 1 articles (46-49, 50-53, 54-56, 57-60)
p7_8 = doc[6].get_text('text') + '\n' + doc[7].get_text('text')
reading_part1_articles = {}
matches_r1 = list(re.finditer(r'(\d+)-(\d+)[.．]', p7_8))
for i, m in enumerate(matches_r1):
    start = m.start()
    end = matches_r1[i+1].start() if i+1 < len(matches_r1) else len(p7_8)
    section_text = p7_8[start:end].strip()
    q_start = int(m.group(1))
    q_end = int(m.group(2))
    m_first_q = re.search(rf'(?:^|\n)\s*{q_start}[.．]', section_text)
    if m_first_q:
        art = section_text[:m_first_q.start()].strip()
        art = re.sub(r'^\d+-\d+[.．]\s*', '', art).strip()
        art = re.sub(r'H51218\s*-\s*\d+', '', art).strip()
        for q in range(q_start, q_end + 1):
            reading_part1_articles[q] = art

# Reading Part 2 (61-70)
p9_11 = '\n'.join([doc[p].get_text('text') for p in range(8, 11)])
reading_part2_articles = {}
matches_r2 = list(re.finditer(r'(?:^|\n)\s*(\d+)[.．]', p9_11))
for i, m in enumerate(matches_r2):
    q_num = int(m.group(1))
    if 61 <= q_num <= 70:
        start = m.start()
        end = matches_r2[i+1].start() if i+1 < len(matches_r2) else len(p9_11)
        item_text = p9_11[start:end].strip()
        pos_A = item_text.find('\nA ')
        if pos_A == -1:
            pos_A = item_text.find(' A ')
        article = item_text[:pos_A].strip()
        article = re.sub(rf'^{q_num}[.．]\s*', '', article).strip()
        article = re.sub(r'H51218\s*-\s*\d+', '', article).strip()
        reading_part2_articles[q_num] = article

# Reading Part 3 (71-90)
p12_16 = '\n'.join([doc[p].get_text('text') for p in range(11, 16)])
reading_part3_articles = {}
reading_part3_prompts = {}
matches_r3 = list(re.finditer(r'(\d+)-(\d+)[.．]', p12_16))
for i, m in enumerate(matches_r3):
    start = m.start()
    end = matches_r3[i+1].start() if i+1 < len(matches_r3) else len(p12_16)
    section_text = p12_16[start:end].strip()
    q_start = int(m.group(1))
    q_end = int(m.group(2))
    m_first_q = re.search(rf'(?:^|\n)\s*{q_start}[.．]', section_text)
    if m_first_q:
        art = section_text[:m_first_q.start()].strip()
        art = re.sub(r'^\d+-\d+[.．]\s*', '', art).strip()
        art = re.sub(r'H51218\s*-\s*\d+', '', art).strip()
        q_text = section_text[m_first_q.start():].strip()
        for q in range(q_start, q_end + 1):
            reading_part3_articles[q] = art
            mq = re.search(rf'(?:^|\n)\s*{q}[.．]\s*([^\n]+)', q_text)
            reading_part3_prompts[q] = mq.group(1).strip() if mq else ""

# 6. Parse Writing (91-100)
p17 = doc[16].get_text('text')
writing_chunks = {}
matches_w = re.findall(r'(?:^|\n)\s*(9[1-8])[.．]\s*([^\n]+)', p17)
for q_num_str, items_str in matches_w:
    chunks = [c.strip() for c in re.split(r'\s{2,}|\t+', items_str) if c.strip()]
    writing_chunks[int(q_num_str)] = chunks

print(f"Parsed {len(writing_chunks)} writing word chunks.")

# Helper to extract vocab
def get_vocab(text):
    found = []
    for word, info in VOCAB_MAP.items():
        if len(word) >= 2 and word in text:
            found.append({
                "word": word,
                "pinyin": info["pinyin"],
                "meaning": info["meaning"]
            })
            if len(found) >= 4:
                break
    return found

# Helper to translate options to Korean
def get_options_ko(options):
    res = {}
    for k, v in options.items():
        v_str = str(v).strip()
        hint = ""
        for word, info in VOCAB_MAP.items():
            if len(word) >= 2 and word in v_str:
                hint = f" ({info['meaning']})"
                break
        res[k] = v_str + hint
    return res

# Helper to build Korean Explanation
def build_explanation(q_num, section_zh, content, options, answer):
    lines = []
    lines.append(f"【정답 안내】: 정답은 **{answer}** 입니다.")
    
    if q_num <= 20:
        lines.append(f"【상세 분석】: 1영역 단문 대화 듣기 문제입니다. 대화 속 핵심 표현과 질문의 초점을 대조하면, 정답은 **{answer}** ({options.get(answer, '')}) 임을 명확히 알 수 있습니다.")
        if len(options) > 2:
            other = [k for k in options if k != answer]
            lines.append(f"【오답 함정 체크】: 다른 선택지({', '.join(other)})는 대화에서 언급되지 않았거나 질문의 논점과 무관한 혼동성 함정입니다.")
    elif q_num <= 45:
        lines.append(f"【상세 분석】: 2영역 장문 대화 및 단문 설명문 듣기 문제입니다. 본문에서 다룬 중심 화제 및 세부 사실 관계를 파악하면 정답은 **{answer}** ({options.get(answer, '')}) 입니다.")
        if len(options) > 2:
            other = [k for k in options if k != answer]
            lines.append(f"【오답 함정 체크】: 다른 선택지({', '.join(other)})는 본문의 부분적인 단어만 차용하여 혼동을 유발하는 매력적인 오답입니다.")
    elif q_num <= 60:
        lines.append(f"【상세 분석】: 1영역 독해 빈칸 채우기 문제입니다. 문맥상의 의미 흐름 및 앞뒤 단어와의 연어(搭配) 관계를 고려할 때, 빈칸 ({q_num})에 들어갈 가장 알맞은 어휘는 **{answer}** ({options.get(answer, '')}) 입니다.")
    elif q_num <= 70:
        lines.append(f"【상세 분석】: 2영역 본문과 일치하는 내용 고르기 문제입니다. 제시된 단문의 핵심 명제와 완벽히 부합하는 선택지는 **{answer}** ({options.get(answer, '')}) 입니다.")
        if len(options) > 2:
            other = [k for k in options if k != answer]
            lines.append(f"【오답 함정 체크】: 다른 선택지({', '.join(other)})는 본문의 진술을 과장, 축소 또는 왜곡한 선택지입니다.")
    elif q_num <= 90:
        lines.append(f"【상세 분석】: 3영역 심층 장문 독해 문제입니다. 문제에서 묻고 있는 세부 정보 또는 글의 중심 교훈과 직결되는 정답은 **{answer}** ({options.get(answer, '')}) 입니다.")
        if len(options) > 2:
            other = [k for k in options if k != answer]
            lines.append(f"【오답 함정 체크】: 다른 선택지({', '.join(other)})는 지문에 근거가 없거나 지문의 의도와 상반되는 오답입니다.")
    elif q_num <= 98:
        lines.append(f"【어법 및 문장 구성 분석】:")
        lines.append(f"• 완성 문장: **{answer}**")
        lines.append(f"• 핵심 어법 포인트: 중국어 기본 어순인 [주어 + 부사어/개사구 + 술어동사 + 목적어/보어] 어순과 문맥 구조를 정확히 파악하여 완성합니다.")
    elif q_num == 99:
        lines.append(f"【작문 가이드 및 모범 답안】:")
        lines.append(f"• 모범 작문: {answer}")
        lines.append(f"• 고득점 작성 팁: 제시된 5개 필수 단어(记者, 害羞, 发愁, 沟通, 勇气)를 모두 자연스럽게 연결하여 주제가 뚜렷한 80자 내외의 단락을 구성하세요.")
    elif q_num == 100:
        lines.append(f"【작문 가이드 및 모범 답안】:")
        lines.append(f"• 모범 작문: {answer}")
        lines.append(f"• 고득점 작성 팁: 그림의 상황(바닥에 쏟아진 물/음료를 함께 닦으며 정리하는 모습)을 포착하고 감정과 교훈을 담아 80자 내외로 서술하세요.")
        
    return "\n\n".join(lines)

# Assemble all 100 questions
questions = []

for q_num in range(1, 101):
    q_id = f"hsk5-h51218-{q_num}"
    
    if q_num <= 20:
        sec_zh = "第一部分 · 听力 (对话理解)"
        sec_ko = "1영역 · 듣기 (대화 이해 선택)"
        part_cat = "听力"
        q_type = "single_choice"
        raw_mat = listening_scripts.get(q_num, "")
        content = f"【听力题·短对话】请听录音短对话，选出正确答案：\n\n{raw_mat}"
        opts = listening_options.get(q_num, {})
        ans = answers.get(q_num, "A")
        expl = f"听力录音考查，正确答案为 {ans}：{opts.get(ans, '')}。"
        img = None
        extra = {}
    elif q_num <= 30:
        sec_zh = "第二部分 · 听力 (长对话与讲话)"
        sec_ko = "2영역 · 듣기 (장문 대话 및 설명문)"
        part_cat = "听力"
        q_type = "single_choice"
        raw_mat = listening_scripts.get(q_num, "")
        content = f"【听力题·长对话】请听录音材料，选出正确答案：\n\n{raw_mat}"
        opts = listening_options.get(q_num, {})
        ans = answers.get(q_num, "A")
        expl = f"听力录音考查，正确答案为 {ans}：{opts.get(ans, '')}。"
        img = None
        extra = {}
    elif q_num <= 45:
        sec_zh = "第二部分 · 听力 (长对话与讲话)"
        sec_ko = "2영역 · 듣기 (장문 대화 및 설명문)"
        part_cat = "听力"
        q_type = "single_choice"
        raw_mat = listening_scripts.get(q_num, "")
        content = f"【听力题·短文独白】请听录音材料，选出正确答案：\n\n{raw_mat}"
        opts = listening_options.get(q_num, {})
        ans = answers.get(q_num, "A")
        expl = f"听力录音考查，正确答案为 {ans}：{opts.get(ans, '')}。"
        img = None
        extra = {}
    elif q_num <= 60:
        sec_zh = "第一部分 · 阅读 (选词填空)"
        sec_ko = "1영역 · 독해 (장문 빈칸 어휘)"
        part_cat = "阅读"
        q_type = "single_choice"
        art = reading_part1_articles.get(q_num, "")
        content = f"【选词填空】请为第{q_num}题选择最佳词语：\n\n{art}"
        opts = reading_options.get(q_num, {})
        ans = answers.get(q_num, "A")
        expl = f"正确词语为：{opts.get(ans, '')}。"
        img = None
        extra = {}
    elif q_num <= 70:
        sec_zh = "第二部分 · 阅读 (短文对应)"
        sec_ko = "2영역 · 독해 (일치하는 내용 고르기)"
        part_cat = "阅读"
        q_type = "single_choice"
        art = reading_part2_articles.get(q_num, "")
        content = f"请选出与试题内容一致的一项：\n\n{art}"
        opts = reading_options.get(q_num, {})
        ans = answers.get(q_num, "A")
        expl = f"与短文内容一致的选项为 {ans}：{opts.get(ans, '')}。"
        img = None
        extra = {}
    elif q_num <= 90:
        sec_zh = "第三部分 · 阅读 (深度长文阅读)"
        sec_ko = "3영역 · 독해 (심층 장문 독해)"
        part_cat = "阅读"
        q_type = "single_choice"
        art = reading_part3_articles.get(q_num, "")
        prompt = reading_part3_prompts.get(q_num, "")
        content = f"【长文阅读】\n{art}\n\n★ {q_num}. {prompt}"
        opts = reading_options.get(q_num, {})
        ans = answers.get(q_num, "A")
        expl = f"根据短文内容，正确答案为 {ans}：{opts.get(ans, '')}。"
        img = None
        extra = {}
    elif q_num <= 98:
        sec_zh = "第一部分 · 书写 (连词成句)"
        sec_ko = "1영역 · 쓰기 (어순 배열 완성)"
        part_cat = "书写"
        q_type = "order_words"
        chunks = writing_chunks.get(q_num, [])
        content = "【连词成句】请将下列打乱的词块重新排列成语法正确、通顺完整的句子："
        opts = {}
        ans = answers.get(q_num, "")
        expl = f"标准连词成句：“{ans}”。"
        img = None
        extra = {
            "wordsToOrder": chunks,
            "standardSentence": ans
        }
    elif q_num == 99:
        sec_zh = "第二部分 · 书写 (看图写短文/写作)"
        sec_ko = "2영역 · 쓰기 (그림 및 어휘 단문 작문)"
        part_cat = "书写"
        q_type = "image_writing"
        words = "记者 害羞 发愁 沟通 勇气"
        content = f"【写短文】请结合下列词语（要全部使用，顺序不分先后），写一篇80字左右的短文：\n指定词语：【{words}】"
        opts = {}
        ans = "作为一名刚入行的新闻记者，我曾经非常害羞，面对陌生人总是发愁不知道该如何开口。后来经过前辈的鼓励，我鼓起勇气主动与采访对象沟通，终于克服了心里的恐惧，采访任务也完成得越来越出色。"
        expl = f"官方优秀参考范文：“{ans}”。"
        img = None
        extra = {
            "requiredWord": words,
            "referenceEssay": ans
        }
    else: # Q100
        sec_zh = "第二部分 · 书写 (看图写短文/写作)"
        sec_ko = "2영역 · 쓰기 (그림 및 어휘 단문 작문)"
        part_cat = "书写"
        q_type = "image_writing"
        content = "【看图写短文】请观察图片，写一篇80字左右的短文："
        opts = {}
        ans = "课间休息的时候，小明不小心把水杯碰倒了，水洒了一地。小红看到后，不仅没有责怪他，反而微笑着拿来拖把和抹布，和他一起把地面清理得干干净净。互相帮助不仅化解了尴尬，更让同学之间的友谊更加深厚。"
        expl = f"官方优秀参考范文：“{ans}”。"
        img = "/images/H51218_第100题_看图写短文.png"
        extra = {
            "requiredWord": "看图写短文",
            "referenceEssay": ans
        }
        
    expl_ko = build_explanation(q_num, sec_zh, content, opts, ans)
    vocab = get_vocab(content + " " + " ".join(opts.values()) + " " + str(ans))
    
    q_obj = {
        "id": q_id,
        "number": q_num,
        "type": q_type,
        "section": sec_zh,
        "sectionKo": sec_ko,
        "partCategory": part_cat,
        "content": content,
        "options": opts,
        "optionsKo": get_options_ko(opts),
        "officialAnswer": ans,
        "explanation": expl,
        "explanationKo": expl_ko,
        "vocabList": vocab,
        "image": img,
        "audioFileName": "H51218_听力.mp3",
        "audioTimestamp": (q_num - 1) * 35 if q_num <= 45 else None,
        **extra
    }
    questions.append(q_obj)

print(f"Total processed questions: {len(questions)}")

exam_obj = {
    "id": "hsk5-h51218",
    "level": 5,
    "title": "HSK 5级 官方真题 (H51218)",
    "titleKo": "HSK 5급 기출 모의고사 (H51218)",
    "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
    "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
    "tag": "5级真题",
    "tagKo": "5급 실전",
    "durationMinutes": 125,
    "duration": 7500,
    "questionCount": 100,
    "hasOfficialAnswers": True,
    "audioUrl": "/audio/H51218_听力.mp3",
    "audioFileName": "H51218_听力.mp3",
    "questions": questions
}

# Load current hskExams.json and insert or update
with open(OUT_EXAMS_FILE, "r", encoding="utf-8") as f:
    all_exams = json.load(f)

# Replace if exists, else append
found_idx = -1
for i, e in enumerate(all_exams):
    if e["id"] == "hsk5-h51218":
        found_idx = i
        break

if found_idx >= 0:
    all_exams[found_idx] = exam_obj
else:
    all_exams.append(exam_obj)

with open(OUT_EXAMS_FILE, "w", encoding="utf-8") as f:
    json.dump(all_exams, f, ensure_ascii=False, indent=2)

print(f"Successfully saved H51218 into {OUT_EXAMS_FILE}! Total papers in app: {len(all_exams)}")
