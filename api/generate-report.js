/**
 * MaruStay — AI 알림장 생성 API
 * POST /api/generate-report
 * OpenAI GPT-4o-mini 사용 (빠르고 저렴, 한국어 우수)
 *
 * 환경 변수 필요:
 *   OPENAI_API_KEY — platform.openai.com 에서 발급
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요.'
    });
  }

  const {
    petName, petBreed, petAge, petGender,
    reportDate,
    mealAm, mealPm, mealEvening, mealNotes,
    bathroomCount,
    activityLevel, mood,
    tempCelsius, humidityPct,
    staffNotes,
  } = req.body || {};

  if (!petName) {
    return res.status(400).json({ error: '반려동물 이름이 필요합니다.' });
  }

  const activityMap = {
    low:    '조용히 쉬었어요',
    normal: '적당히 활발하게 지냈어요',
    high:   '매우 활발하게 뛰어놀았어요',
  };
  const moodMap = {
    great:   '매우 좋음 😊',
    good:    '좋음 🙂',
    neutral: '보통 😐',
    tired:   '피곤해 보임 😴',
    anxious: '약간 불안해 보임 😟',
  };

  const lines = [
    '[반려동물 정보]',
    `이름: ${petName}`,
    petBreed  ? `품종: ${petBreed}`  : null,
    petAge    ? `나이: ${petAge}세`  : null,
    petGender ? `성별: ${petGender}` : null,
    '',
    `[${reportDate || '오늘'} 하루 기록]`,
    `아침 식사: ${mealAm     || '기록 없음'}`,
    `점심 식사: ${mealPm     || '기록 없음'}`,
    `저녁 식사: ${mealEvening || '기록 없음'}`,
    mealNotes   ? `식사 메모: ${mealNotes}` : null,
    `배변: ${bathroomCount ?? 0}회`,
    `활동성: ${activityMap[activityLevel] || activityLevel || '보통'}`,
    `전반적 컨디션: ${moodMap[mood] || mood || '좋음'}`,
    tempCelsius ? `실내 온도: ${tempCelsius}°C` : null,
    humidityPct ? `실내 습도: ${humidityPct}%`  : null,
    staffNotes  ? `특이사항: ${staffNotes}`      : null,
  ].filter(Boolean).join('\n');

  const userPrompt = `반려동물 호텔에서 하루를 보낸 아이의 기록을 보호자님께 따뜻하게 전달하는 알림장을 작성해주세요.

${lines}

조건:
- 보호자님께 직접 말하는 형식 (존댓말)
- 구체적이고 생생하게 묘사 (예: "잘 드셨어요" 대신 "사료를 싹싹 비웠어요")
- 이모지 2~3개 자연스럽게 활용
- 200~250자 분량 (너무 짧거나 길지 않게)
- 마지막 문장은 내일에 대한 기대 또는 보호자님께 안심이 되는 메시지로 마무리
- 불필요한 포맷(제목, 줄바꿈 과다 등) 없이 자연스러운 글 형식으로만 작성`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        temperature: 0.8,
        messages: [
          {
            role: 'system',
            content: '당신은 MaruStay의 AI 알림장 작성 도우미입니다. 반려동물 호텔에 맡겨진 아이의 하루를 보호자에게 따뜻하고 생생하게 전달합니다.'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      return res.status(500).json({
        error: errData.error?.message || 'OpenAI API 오류가 발생했습니다.'
      });
    }

    const data = await response.json();
    const reportText = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ report: reportText });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
