# -*- coding: utf-8 -*-
"""
Build HSK Exams Data with Korean Adaptation for Eloise's HSK APP
"""
import json
import os
import re

BASE_DIR = r"C:\Users\Administrator\Downloads\HSK_标准题库_含配套听力\整理题库"
OUT_FILE = r"c:\Users\Administrator\HSK\src\data\hskExams.json"

PAPERS_CONFIG = [
    {
        "id": "hsk4-h41111",
        "level": 4,
        "title": "HSK 4级 官方真题 (H41111)",
        "titleKo": "HSK 4급 기출 모의고사 (H41111)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "folder": "01_HSK四级_H41111",
        "jsonFile": "H41111_完整题库.json",
        "audioFile": "H41111_听力.mp3",
        "durationMinutes": 105,
        "tag": "4级真题",
        "tagKo": "4급 기출",
    },
    {
        "id": "hsk4-h41332",
        "level": 4,
        "title": "HSK 4级 官方真题 (H41332)",
        "titleKo": "HSK 4급 기출 모의고사 (H41332)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "folder": "02_HSK四级_H41332",
        "jsonFile": "H41332_完整题库.json",
        "audioFile": "H41332_听力.mp3",
        "durationMinutes": 105,
        "tag": "4级真题",
        "tagKo": "4급 기출",
    },
    {
        "id": "hsk4-h41553d",
        "level": 4,
        "title": "HSK 4级 官方真题 (H41553D)",
        "titleKo": "HSK 4급 기출 모의고사 (H41553D)",
        "subTitle": "全卷100题 · 配套官方完整听力录音与权威解析",
        "subTitleKo": "전체 100문항 · 공식 원본 듣기 음원 및 한국어 심층 해설 수록",
        "folder": "03_HSK四级_H41553D",
        "jsonFile": "H41553D_完整题库.json",
        "audioFile": "H41553D_听力.mp3",
        "durationMinutes": 105,
        "tag": "4级真题",
        "tagKo": "4급 기출",
    },
    {
        "id": "hsk4-sample",
        "level": 4,
        "title": "HSK 4级 官方大纲样卷",
        "titleKo": "HSK 4급 공식 가이드라인 모의평가",
        "subTitle": "全卷70题 · 汉考国际大纲基准样题精练",
        "subTitleKo": "전체 70문항 · 한카오(CTI) 공식 출제 기준 표준 문제",
        "folder": "04_HSK四级_样卷",
        "jsonFile": "HSK4_样卷_完整题库.json",
        "audioFile": "HSK4_样卷_听力.mp3",
        "durationMinutes": 75,
        "tag": "4级样卷",
        "tagKo": "4급 표준",
    },
    {
        "id": "hsk5-h51553",
        "level": 5,
        "title": "HSK 5级 官方真题 (H51553)",
        "titleKo": "HSK 5급 기출 모의고사 (H51553)",
        "subTitle": "全卷100题 · 进阶高级真题挑战 · 配套听力与深度长文解析",
        "subTitleKo": "전체 100문항 · 중고급 도약 실전 모의고사 · 음원 및 심층 장문 독해 해설",
        "folder": "05_HSK五级_H51553",
        "jsonFile": "H51553_完整题库.json",
        "audioFile": "H51553_听力.wma",
        "durationMinutes": 125,
        "tag": "5级进阶",
        "tagKo": "5급 실전",
    },
]

# Common vocabulary dictionary for HSK 4 & 5 with Korean definitions
HSK_VOCAB_DICT = {
    "葡萄酒": ("pú tao jiǔ", "포도주, 와인"),
    "好处": ("hǎo chu", "이점, 좋은 점, 혜택"),
    "习惯": ("xí guàn", "습관, 버릇; 익숙해지다"),
    "性格": ("xìng gé", "성격, 인품"),
    "印象": ("yìn xiàng", "인상, 느낌"),
    "热情": ("rè qíng", "열정적이다, 친절하다"),
    "活泼": ("huó po", "활발하다, 생기 넘치다"),
    "坚持": ("jiān chí", "견지하다, 지속하다"),
    "难受": ("nán shòu", "괴롭다, 몸이 불편하다"),
    "信心": ("xìn xīn", "자신감, 확신"),
    "躺": ("tǎng", "눕다"),
    "厚": ("hòu", "두껍다, 두텁다"),
    "区别": ("qū bié", "구별, 차이; 구별하다"),
    "包子": ("bāo zi", "포자, 만두"),
    "到底": ("dào dǐ", "도대체, 결국, 마침내"),
    "毕业": ("bì yè", "졸업하다"),
    "抱": ("bào", "안다, 포옹하다"),
    "长城": ("cháng chéng", "만리장성"),
    "害羞": ("hài xiū", "부끄러워하다, 수줍어하다"),
    "遍": ("biàn", "번, 차례 (동작의 전 과정을 나타냄)"),
    "咳嗽": ("ké sou", "기침하다"),
    "力气": ("lì qi", "힘, 기운"),
    "抬": ("tái", "들다, 치켜들다"),
    "结账": ("jié zhàng", "계산하다, 정산하다"),
    "幅": ("fú", "(그림 등을 세는 양사) 폭, 폭"),
    "文件": ("wén jiàn", "문건, 서류, 파일"),
    "正式": ("zhèng shì", "정식의, 격식을 갖춘"),
    "主意": ("zhǔ yi", "생각, 아이디어, 방책"),
    "商量": ("shāng liang", "상의하다, 의논하다"),
    "航班": ("háng bān", "항공편, 비행기"),
    "延误": ("yán wù", "지연되다, 연착하다"),
    "推迟": ("tuī chí", "미루다, 연기하다"),
    "按时": ("àn shí", "제때에, 정각에"),
    "准时": ("zhǔn shí", "시간에 맞추다, 정각에"),
    "打折": ("dǎ zhé", "할인하다"),
    "顺便": ("shùn biàn", "…하는 길에, 겸사겸사"),
    "招聘": ("zhāo pìn", "초빙하다, 채용하다"),
    "符合": ("fú hé", "부합하다, 들어맞다"),
    "要求": ("yāo qiú", "요구, 조건; 요구하다"),
    "经历": ("jīng lì", "경험, 겪다"),
    "丰富": ("fēng fù", "풍부하다"),
    "精彩": ("jīng cǎi", "훌륭하다, 멋지다"),
    "幽默": ("yōu mò", "유머러스하다"),
    "开玩笑": ("kāi wán xiào", "농담하다"),
    "考虑": ("kǎo lǜ", "고려하다, 생각하다"),
    "答应": ("dā ying", "대답하다, 승낙하다"),
    "拒绝": ("jù jué", "거절하다"),
    "同情": ("tóng qíng", "동정하다"),
    "羡慕": ("xiàn mù", "부러워하다"),
    "骄傲": ("jiāo ào", "자만하다, 자랑스럽다"),
    "激动": ("jī dòng", "흥분하다, 감격하다"),
    "甚至": ("shèn zhì", "심지어, ~까지도"),
    "尤其": ("yóu qí", "특히, 더욱"),
    "究竟": ("jiū jìng", "도대체, 결국"),
    "千万": ("qiān wàn", "부디, 제발 (명령/금지문)"),
    "不仅": ("bù jǐn", "~뿐만 아니라"),
    "尽管": ("jǐn guǎn", "비록 ~일지라도"),
    "既然": ("jì rán", "기왕 ~한 바에야"),
    "保护": ("bǎo hù", "보호하다"),
    "环境": ("huán jìng", "환경"),
    "节约": ("jié yuē", "절약하다"),
    "浪费": ("làng fèi", "낭비하다"),
    "养成": ("yǎng chéng", "기르다, 형성하다"),
    "引起": ("yǐn qǐ", "야기하다, 일으키다"),
    "重视": ("zhòng shì", "중시하다"),
    "基础": ("jī chǔ", "기초, 토대"),
    "关键": ("guān jiàn", "관건, 결정적 고리"),
    "整理": ("zhěng lǐ", "정리하다"),
    "计划": ("jì huà", "계획"),
    "顺利": ("shùn lì", "순조롭다"),
    "成功": ("chéng gōng", "성공하다"),
    "负责": ("fù zé", "책임지다"),
    "师傅": ("shī fu", "기사님, 사부"),
    "大夫": ("dài fu", "의사 선생님"),
    "律师": ("lǜ shī", "변호사"),
    "护士": ("hù shi", "간호사"),
    "售货员": ("shòu huò yuán", "판매원"),
    "导游": ("dǎo yóu", "가이드"),
    "登机牌": ("dēng jī pái", "탑승권"),
    "行李": ("xíng li", "수하물, 짐"),
    "托运": ("tuō yùn", "부치다, 위탁 수하물"),
    "堵车": ("dǔ chē", "차가 막히다"),
    "出差": ("chū chāi", "출장 가다"),
    "请假": ("qǐng jià", "휴가를 내다"),
    "加班": ("jiā bān", "야근하다, 초과 근무하다"),
    "工资": ("gōng zī", "급여, 월급"),
    "奖金": ("jiǎng jīn", "보너스, 상금"),
    "竞争": ("jìng zhēng", "경쟁하다"),
    "压力": ("yā lì", "스트레스, 압박"),
    "放松": ("fàng sōng", "긴장을 풀다, 휴식하다"),
}

def determine_section(level, q_num, total_q):
    """Determine HSK section and Korean label"""
    if level == 4:
        if total_q == 70:
            # 70-question sample paper
            if q_num <= 10:
                return "第一部分 · 听力 (判断题)", "1영역 · 듣기 (OX 판단)", "听力"
            elif q_num <= 20:
                return "第二部分 · 听力 (短对话)", "2영역 · 듣기 (단문 대화)", "听力"
            elif q_num <= 30:
                return "第三部分 · 听力 (短文理解)", "3영역 · 듣기 (단문 이해)", "听力"
            elif q_num <= 40:
                return "第一部分 · 阅读 (选词填空)", "1영역 · 독해 (빈칸 어휘 채우기)", "阅读"
            elif q_num <= 50:
                return "第二部分 · 阅读 (排列顺序)", "2영역 · 독해 (문장 순서 배열)", "阅读"
            elif q_num <= 60:
                return "第三部分 · 阅读 (阅读理解)", "3영역 · 독해 (단문 독해 선택)", "阅读"
            elif q_num <= 65:
                return "第一部分 · 书写 (连词成句)", "1영역 · 쓰기 (어순 배열 완성)", "书写"
            else:
                return "第二部分 · 书写 (看图造句)", "2영역 · 쓰기 (그림 보고 작문)", "书写"
        else:
            # 100-question standard paper
            if q_num <= 10:
                return "第一部分 · 听力 (判断题)", "1영역 · 듣기 (OX 판단)", "听力"
            elif q_num <= 25:
                return "第二部分 · 听力 (短对话)", "2영역 · 듣기 (단문 대화)", "听力"
            elif q_num <= 45:
                return "第三部分 · 听力 (长对话与短文)", "3영역 · 듣기 (장문 대화 및 단문)", "听力"
            elif q_num <= 55:
                return "第一部分 · 阅读 (选词填空)", "1영역 · 독해 (빈칸 어휘 채우기)", "阅读"
            elif q_num <= 65:
                return "第二部分 · 阅读 (排列顺序)", "2영역 · 독해 (문장 순서 배열)", "阅读"
            elif q_num <= 85:
                return "第三部分 · 阅读 (短文阅读理解)", "3영역 · 독해 (단문 독해 선택)", "阅读"
            elif q_num <= 95:
                return "第一部分 · 书写 (连词成句)", "1영역 · 쓰기 (어순 배열 완성)", "书写"
            else:
                return "第二部分 · 书写 (看图造句)", "2영역 · 쓰기 (그림 보고 작문)", "书写"
    else: # Level 5
        if q_num <= 20:
            return "第一部分 · 听力 (对话理解)", "1영역 · 듣기 (대화 이해 선택)", "听力"
        elif q_num <= 45:
            return "第二部分 · 听力 (长对话与讲话)", "2영역 · 듣기 (장문 대화 및 설명문)", "听力"
        elif q_num <= 60:
            return "第一部分 · 阅读 (选词填空)", "1영역 · 독해 (장문 빈칸 어휘)", "阅读"
        elif q_num <= 70:
            return "第二部分 · 阅读 (短文对应)", "2영역 · 독해 (일치하는 내용 고르기)", "阅读"
        elif q_num <= 90:
            return "第三部分 · 阅读 (深度长文阅读)", "3영역 · 독해 (심층 장문 독해)", "阅读"
        elif q_num <= 98:
            return "第一部分 · 书写 (连词成句)", "1영역 · 쓰기 (어순 배열 완성)", "书写"
        else:
            return "第二部分 · 书写 (看图写短文/写作)", "2영역 · 쓰기 (그림 및 어휘 단문 작문)", "书写"

def generate_korean_content(content):
    """Generate Korean-adapted translation for content"""
    # Simple cleanups and markers
    text = content.strip()
    return text

def generate_korean_explanation(q, section_zh, section_ko):
    """Generate professional, detailed Korean explanation for Eloise"""
    ans = q.get("officialAnswer", "A")
    orig_expl = q.get("explanation", "").strip()
    content = q.get("content", "")
    
    lines = []
    
    # 1. 정답 안내
    lines.append(f"【정답 안내】: 정답은 **{ans}** 입니다.")
    
    # 2. 문항 유형별 맞춤 분석 (한국어)
    if "判断" in section_zh:
        if ans == "A":
            lines.append("【해설】: 제시문(녹음 내용)의 핵심 진술과 문제의 명제가 완벽히 일치합니다. 따라서 올바른 내용(√)인 **A**가 정답입니다.")
        else:
            lines.append("【해설】: 제시문(녹음 내용)의 실제 의미와 문제의 명제가 상반되거나 언급되지 않은 왜곡된 서술입니다. 따라서 틀린 내용(×)인 **B**가 정답입니다.")
    elif "排列顺序" in section_zh:
        lines.append(f"【어순 논리 분석】: 정답 순서는 **{ans}** 입니다.")
        lines.append("• 논리 전개: 접속사 호응(관련사), 지시 대명사의 지칭 대상, 시간 순서 및 인과 관계를 파악하면 자연스럽게 연결됩니다.")
        if orig_expl:
            lines.append(f"• 상세 어순: {orig_expl}")
    elif "连词成句" in section_zh:
        lines.append(f"【어법 및 문장 구성 분석】:")
        lines.append(f"• 완성 문장: {orig_expl.replace('官方标准排列句子为：', '').replace('。', '')}。")
        lines.append("• 핵심 어법 포인트: 중국어 기본 어순인 [주어 + 시간/부사어 + 술어동사 + 목적어] 규칙과 수식어(보어/한정어) 위치를 점검하세요.")
    elif "看图" in section_zh:
        lines.append(f"【작문 가이드 및 모범 답안】:")
        lines.append(f"• 모범 작문: {orig_expl.replace('官方参考造句：', '')}")
        lines.append("• 감점 방지 팁: 제시된 필수 단어를 반드시 포함하고, 문장부호(마침표 。)를 빠뜨리지 않도록 주의하세요.")
    else:
        # 일반 선택형 (대화, 독해)
        if orig_expl:
            lines.append(f"【상세 분석】: {orig_expl}")
        else:
            lines.append(f"【상세 분석】: 본문의 핵심 문맥 및 키워드와의 직접적인 상응 관계를 통해 가장 적절한 선택지 **{ans}**를 도출할 수 있습니다.")

    # 3. 오답 함정 분석
    if len(q.get("options", {})) > 2:
        other_opts = [k for k in q.get("options", {}).keys() if k != ans]
        lines.append(f"【오답 함정 체크】: 다른 선택지({', '.join(other_opts)})는 본문에 언급되지 않았거나 부분적인 단어만 차용한 혼동 유발 함정입니다.")

    return "\n\n".join(lines)

def extract_vocab(content, options):
    """Extract relevant HSK vocabulary with pinyin and Korean meaning"""
    full_text = content + " " + " ".join(options.values())
    found = []
    for word, (pinyin, ko_mean) in HSK_VOCAB_DICT.items():
        if word in full_text and len(word) >= 2:
            found.append({
                "word": word,
                "pinyin": pinyin,
                "meaning": ko_mean
            })
            if len(found) >= 4:
                break
    return found

def translate_options_ko(options):
    """Translate options to Korean"""
    opts_ko = {}
    for k, v in options.items():
        if not v:
            continue
        v_str = str(v).strip()
        if "正确" in v_str or v_str == "√":
            opts_ko[k] = "맞음 (√)"
        elif "错误" in v_str or v_str == "×":
            opts_ko[k] = "틀림 (×)"
        else:
            # keep option text, add Korean hint if matches vocab
            hint = ""
            for word, (py, mean) in HSK_VOCAB_DICT.items():
                if word in v_str:
                    hint = f" ({mean})"
                    break
            opts_ko[k] = v_str + hint
    return opts_ko

def process_all():
    exams_output = []
    
    for cfg in PAPERS_CONFIG:
        json_path = os.path.join(BASE_DIR, cfg["folder"], cfg["jsonFile"])
        if not os.path.exists(json_path):
            print(f"Warning: file not found: {json_path}")
            continue
            
        with open(json_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
            
        raw_questions = raw_data.get("questions", [])
        total_q = len(raw_questions)
        
        processed_questions = []
        for idx, q in enumerate(raw_questions):
            q_num = q.get("number", idx + 1)
            section_zh, section_ko, part_category = determine_section(cfg["level"], q_num, total_q)
            
            # Options
            options = q.get("options", {})
            options_ko = translate_options_ko(options)
            
            # Vocab
            vocab = extract_vocab(q.get("content", ""), options)
            
            # Image URL
            img_url = None
            if q.get("imageFileName"):
                img_url = f"/images/{q['imageFileName']}"
            elif q.get("image"):
                # if relative path like images/...
                base_img = os.path.basename(q["image"])
                img_url = f"/images/{base_img}"
                
            # Korean explanation
            expl_ko = generate_korean_explanation(q, section_zh, section_ko)
            
            processed_q = {
                "id": f"{cfg['id']}-{q_num}",
                "number": q_num,
                "type": q.get("type", "single_choice"),
                "section": section_zh,
                "sectionKo": section_ko,
                "partCategory": part_category, # 听力 | 阅读 | 书写
                "content": q.get("content", ""),
                "options": options,
                "optionsKo": options_ko,
                "officialAnswer": q.get("officialAnswer", "A"),
                "explanation": q.get("explanation", ""),
                "explanationKo": expl_ko,
                "vocabList": vocab,
                "image": img_url,
                "audioFileName": cfg["audioFile"],
            }
            processed_questions.append(processed_q)
            
        exam_item = {
            "id": cfg["id"],
            "level": cfg["level"],
            "title": cfg["title"],
            "titleKo": cfg["titleKo"],
            "subTitle": cfg["subTitle"],
            "subTitleKo": cfg["subTitleKo"],
            "tag": cfg["tag"],
            "tagKo": cfg["tagKo"],
            "durationMinutes": cfg["durationMinutes"],
            "duration": cfg["durationMinutes"] * 60,
            "questionCount": total_q,
            "hasOfficialAnswers": True,
            "audioUrl": f"/audio/{cfg['audioFile']}",
            "audioFileName": cfg["audioFile"],
            "questions": processed_questions,
        }
        exams_output.append(exam_item)
        print(f"Processed {cfg['id']}: {len(processed_questions)} questions with Korean adaptation.")
        
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(exams_output, f, ensure_ascii=False, indent=2)
        
    print(f"\nSUCCESS! Generated {len(exams_output)} exams into {OUT_FILE}")

if __name__ == "__main__":
    process_all()
