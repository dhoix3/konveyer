# Фаза 3: звук, голоса и субтитры

Проверено запуском: npm test, typecheck; синтетический WAV 16 kHz PCM с двумя
звуковыми участками и тишиной до/между/после них. Проверены RIFF chunks с padding,
ошибки усечённых данных, амплитуда, закрытие рта независимо от эмоции, legacy
fallback, предоставленные временные метки слов и опциональные timed phonemes.
Полная проверка Rurikids narration/claims: ../phase2-fidelity/REPORT.json.

Timeline для настоящего аудиофайла вычисляет 20ms RMS-envelope; в план попадают
speech.values/words/wordTiming. Паузы имеют значение 0. Это реальный анализ PCM,
а не синус по времени. Старые планы без speech работают по-прежнему. Если файл
не удалось проанализировать, fallback явно попадает в plan.speechWarnings и QA.

Слова без предоставленной разметки размещаются по активным RMS bins пропорционально
числу токенов: **energy-estimated**, не ASR/forced alignment и не точные границы слов.
Для точности нужны предоставленные words={text,start,end} в voice manifest (секунды
относительно клипа). Optional phonemes={phoneme,start,end} дают closed/round/open
visemes; используемая Piper API не обещает timed phonemes, поэтому они не выдуманы.

CLI из engine:
- `node render.mjs voices` — реестр ролей/языков/моделей/просодии.
- `node render.mjs voices --download ru-narrator` — явный запрос скачивания модели.
- `node render.mjs voices --preview ru-narrator` — реальный Piper preview в output,
  без перезаписи существующего preview (повтор через --force).
- project.settings.voiceProfiles={voiceId:profileId}; voiceProsody={voiceId:{speed,
  pitch,noiseScale,noiseW}}. Пределы проверяются; cache hash учитывает просодию.
- `voice <id> --audio <recording>` / `--mode files` сохраняют прежний импорт записи.
- `timeline <id>` автоматически пишет subtitles/captions.srt/vtt/ass и qa.json.
- `subtitles <id> --strict` считает overflow/reading speed основанием отказа.

textnorm: ударения исторических имён, контекстные римские номера правителей/веков,
трёхзначные годы; старые нормализации и явные ударения сохранены. Это ограниченный
лексикон, не полноценный морфологический анализатор древнерусского языка.

Не проверено: реальный Piper/Denis, скачивание с Hugging Face, запись человека,
фонемный timing Piper и визуальная артикуляция в Chrome. Нет этих внешних компонентов.
В evidence — синтетическая огибающая, SVG график и реальные экспортированные
SRT/VTT/ASS (разметка energy-estimated), логи тестов. Нет фиктивного аудиорендера.
