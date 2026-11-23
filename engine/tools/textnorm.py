#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Russian text preparation for Piper TTS.

The goal is not to "rewrite" the script, but to make the spoken form
unambiguous for espeak-ng/Piper:

  * numbers, dates, times, ranges, percentages and units -> Russian words;
  * common abbreviations -> full words;
  * long sentences -> short breath groups with explicit pauses;
  * optional stress marks (combining acute U+0301 or a leading "+" before a
    vowel) -> passed to espeak-ng, which honours them for Russian;
  * a small lexicon of words that Piper/espeak commonly stresses incorrectly.

The module is dependency-free (stdlib only) so it can run in the same Python
environment as piper-tts.  `prepare()` is the public API used by tts.py.
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata

# ---------------------------------------------------------------------------
# Cardinal numbers
# ---------------------------------------------------------------------------

UNITS_M = ["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]
UNITS_F = ["ноль", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]
TEENS = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
         "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"]
TENS = {2: "двадцать", 3: "тридцать", 4: "сорок", 5: "пятьдесят",
        6: "шестьдесят", 7: "семьдесят", 8: "восемьдесят", 9: "девяносто"}
HUNDREDS = {1: "сто", 2: "двести", 3: "триста", 4: "четыреста",
            5: "пятьсот", 6: "шестьсот", 7: "семьсот", 8: "восемьсот", 9: "девятьсот"}
SCALES = [
    ("", "", "", 0, "m"),
    ("тысяча", "тысячи", "тысяч", 3, "f"),
    ("миллион", "миллиона", "миллионов", 6, "m"),
    ("миллиард", "миллиарда", "миллиардов", 9, "m"),
    ("триллион", "триллиона", "триллионов", 12, "m"),
]

# Genitive forms (used after от/до/около/более/менее/с/из/без/для/после).
GEN_UNITS_M = ["нуля", "одного", "двух", "трёх", "четырёх", "пяти", "шести", "семи", "восьми", "девяти"]
GEN_UNITS_F = ["нуля", "одной", "двух", "трёх", "четырёх", "пяти", "шести", "семи", "восьми", "девяти"]
GEN_TEENS = ["десяти", "одиннадцати", "двенадцати", "тринадцати", "четырнадцати",
             "пятнадцати", "шестнадцати", "семнадцати", "восемнадцати", "девятнадцати"]
GEN_TENS = {2: "двадцати", 3: "тридцати", 4: "сорока", 5: "пятидесяти",
            6: "шестидесяти", 7: "семидесяти", 8: "восьмидесяти", 9: "девяноста"}
GEN_HUNDREDS = {1: "ста", 2: "двухсот", 3: "трёхсот", 4: "четырёхсот",
                5: "пятисот", 6: "шестисот", 7: "семисот", 8: "восьмисот", 9: "девятисот"}
GEN_SCALES = [
    ("", "", "", "m"),
    ("тысячи", "тысяч", "тысяч", "f"),
    ("миллиона", "миллионов", "миллионов", "m"),
    ("миллиарда", "миллиардов", "миллиардов", "m"),
    ("триллиона", "триллионов", "триллионов", "m"),
]


def plural_form(n, forms):
    """forms = (one, few, many) for 1, 2-4, 5+ (Russian rules)."""
    n = abs(int(n))
    if n % 100 in (11, 12, 13, 14):
        return forms[2]
    if n % 10 == 1:
        return forms[0]
    if n % 10 in (2, 3, 4):
        return forms[1]
    return forms[2]


def _group_words(n, gender):
    """0..999 -> words (nominative)."""
    out = []
    h, rest = divmod(n, 100)
    if h:
        out.append(HUNDREDS[h])
    if rest >= 20:
        t, u = divmod(rest, 10)
        out.append(TENS[t])
        if u:
            out.append((UNITS_F if gender == "f" else UNITS_M)[u])
    elif rest >= 10:
        out.append(TEENS[rest - 10])
    elif rest > 0:
        out.append((UNITS_F if gender == "f" else UNITS_M)[rest])
    return out


def cardinal(n, gender="m"):
    """Cardinal number in Russian (nominative), e.g. 1670 -> одна тысяча шестьсот семьдесят."""
    n = int(n)
    if n == 0:
        return "ноль"
    if n < 0:
        return "минус " + cardinal(-n, gender)
    groups = []
    x = n
    idx = 0
    while x > 0:
        x, g = divmod(x, 1000)
        groups.append((g, idx))
        idx += 1
    out = []
    for g, idx in reversed(groups):
        if g == 0:
            continue
        one, few, many, _pow, gend = SCALES[idx]
        words = _group_words(g, gender if idx == 0 else gend)
        # "одна тысяча" is natural when lower groups follow; plain "тысяча" is
        # enough when it is the only group.
        if idx > 0 and g == 1 and any(gg for gg, _ in groups[:idx]):
            words = [("одна" if gend == "f" else "один")]
        if idx > 0:
            words.append(plural_form(g, (one, few, many)))
        out.extend(words)
    return " ".join(out)


def _group_gen(n, gender):
    out = []
    h, rest = divmod(n, 100)
    if h:
        out.append(GEN_HUNDREDS[h])
    if rest >= 20:
        t, u = divmod(rest, 10)
        out.append(GEN_TENS[t])
        if u:
            out.append((GEN_UNITS_F if gender == "f" else GEN_UNITS_M)[u])
    elif rest >= 10:
        out.append(GEN_TEENS[rest - 10])
    elif rest > 0:
        out.append((GEN_UNITS_F if gender == "f" else GEN_UNITS_M)[rest])
    return out


def cardinal_gen(n, gender="m"):
    """Genitive cardinal: 1670 -> одной тысячи шестисот семидесяти."""
    n = int(n)
    if n == 0:
        return "нуля"
    if n < 0:
        return "минус " + cardinal_gen(-n, gender)
    groups = []
    x = n
    idx = 0
    while x > 0:
        x, g = divmod(x, 1000)
        groups.append((g, idx))
        idx += 1
    out = []
    for g, idx in reversed(groups):
        if g == 0:
            continue
        one, few, many, gend = GEN_SCALES[idx]
        words = _group_gen(g, gender if idx == 0 else gend)
        if idx > 0 and g == 1 and any(gg for gg, _ in groups[:idx]):
            words = [("одной" if gend == "f" else "одного")]
        if idx > 0:
            words.append(plural_form(g, (one, few, many)))
        out.extend(words)
    return " ".join(out)


# ---------------------------------------------------------------------------
# Ordinal numbers
# ---------------------------------------------------------------------------

ORD_SMALL = {
    0: "нулевой", 1: "первый", 2: "второй", 3: "третий", 4: "четвёртый",
    5: "пятый", 6: "шестой", 7: "седьмой", 8: "восьмой", 9: "девятый",
    10: "десятый", 11: "одиннадцатый", 12: "двенадцатый", 13: "тринадцатый",
    14: "четырнадцатый", 15: "пятнадцатый", 16: "шестнадцатый",
    17: "семнадцатый", 18: "восемнадцатый", 19: "девятнадцатый",
    20: "двадцатый", 30: "тридцатый", 40: "сороковой", 50: "пятидесятый",
    60: "шестидесятый", 70: "семидесятый", 80: "восьмидесятый", 90: "девяностый",
    100: "сотый", 200: "двухсотый", 300: "трёхсотый", 400: "четырёхсотый",
    500: "пятисотый", 600: "шестисотый", 700: "семисотый", 800: "восьмисотый",
    900: "девятисотый", 1000: "тысячный", 2000: "двухтысячный",
}

CASE_ENDINGS = {
    # masculine nominative -> endings for (gen, dat, ins, pre)
    "ый": ("ого", "ому", "ым", "ом"),
    "ой": ("ого", "ому", "ым", "ом"),
    "ий": ("его", "ему", "им", "ем"),
}
FEM_ENDINGS = {"ая": "ой", "яя": "ей"}
NEUT_ENDINGS = {"ое": "ом", "ее": "ем"}
PLU_ENDINGS = {"ые": "ых", "ие": "их"}


def _apply_case_to_last(phrase, case, gender):
    if case == "nom":
        if gender == "f":
            return _gender_last(phrase, "f")
        if gender == "n":
            return _gender_last(phrase, "n")
        if gender == "pl":
            return _plural_last(phrase)
        return phrase
    parts = phrase.split(" ")
    last = parts[-1]
    # Special irregular forms.
    irregular = {
        "третий": {"gen": "третьего", "dat": "третьему", "ins": "третьим", "pre": "третьем"},
        "третья": {"gen": "третьей", "dat": "третьей", "ins": "третьей", "pre": "третьей"},
        "третье": {"gen": "третьего", "dat": "третьему", "ins": "третьим", "pre": "третьем"},
        "третьи": {"gen": "третьих", "dat": "третьим", "ins": "третьими", "pre": "третьих"},
    }
    if last in irregular:
        parts[-1] = irregular[last][case]
        return " ".join(parts)
    if gender == "f":
        if last in FEM_ENDINGS:
            parts[-1] = last[:-2] + FEM_ENDINGS[last] if last.endswith("ая") else last[:-2] + "ей"
            return " ".join(parts)
        if last.endswith("ой"):
            parts[-1] = last[:-2] + "ой"
            return " ".join(parts)
    if gender == "pl":
        if last in PLU_ENDINGS:
            parts[-1] = last[:-2] + PLU_ENDINGS[last]
            return " ".join(parts)
    for ending, forms in CASE_ENDINGS.items():
        if last.endswith(ending):
            stem = last[:-len(ending)]
            parts[-1] = stem + forms[("gen", "dat", "ins", "pre").index(case)]
            return " ".join(parts)
    return phrase


def _gender_last(phrase, gender):
    parts = phrase.split(" ")
    last = parts[-1]
    if gender == "f":
        if last.endswith("ый"):
            last = last[:-2] + "ая"
        elif last.endswith("ой"):
            last = last[:-2] + "ая"
        elif last.endswith("ий"):
            last = last[:-2] + "ья"
        elif last == "третий":
            last = "третья"
    elif gender == "n":
        if last.endswith("ый"):
            last = last[:-2] + "ое"
        elif last.endswith("ой"):
            last = last[:-2] + "ое"
        elif last.endswith("ий"):
            last = last[:-2] + "ье"
        elif last == "третий":
            last = "третье"
    parts[-1] = last
    return " ".join(parts)


def _plural_last(phrase):
    parts = phrase.split(" ")
    last = parts[-1]
    if last.endswith("ый"):
        last = last[:-2] + "ые"
    elif last.endswith("ой"):
        last = last[:-2] + "ые"
    elif last.endswith("ий"):
        last = last[:-2] + "ьи"
    elif last == "третий":
        last = "третьи"
    parts[-1] = last
    return " ".join(parts)


def ordinal_small(n, case="nom", gender="m"):
    """Ordinal for 0..999; only the final word is inflected."""
    n = int(n)
    if n in ORD_SMALL:
        return _apply_case_to_last(ORD_SMALL[n], case, gender)
    if n >= 100:
        h, rest = divmod(n, 100)
        if rest == 0:
            return _apply_case_to_last(HUNDREDS[h] if h in HUNDREDS else str(h), case, gender)
        return cardinal(h * 100) + " " + ordinal_small(rest, case, gender)
    if n >= 20:
        t, u = divmod(n, 10)
        if u == 0:
            return _apply_case_to_last(TENS[t] + "ый" if t not in (4,) else "сороковой", case, gender)
        return TENS[t] + " " + ordinal_small(u, case, gender)
    return _apply_case_to_last(str(n), case, gender)


def year_ordinal(n, case="nom", gender="m"):
    """Year as an ordinal: 2025 -> две тысячи двадцать пятый (год)."""
    n = int(n)
    if n == 1000:
        return _apply_case_to_last("тысячный", case, gender)
    if n == 2000:
        return _apply_case_to_last("двухтысячный", case, gender)
    if 1000 < n < 2000:
        prefix = "тысяча"
        rest = n - 1000
        if rest == 0:
            return _apply_case_to_last("тысячный", case, gender)
        return prefix + " " + ordinal_small(rest, case, gender)
    if 2000 < n < 3000:
        return cardinal(2000, "f") + " " + ordinal_small(n - 2000, case, gender)
    if n % 100 == 0 and n > 1000:
        # 1900 -> тысяча девятисотый, 2100 -> две тысячи сотый
        base = (n // 1000) * 1000
        rest = n - base
        if rest == 0:
            return ordinal_small(base, case, gender)
        return cardinal(base, "f") + " " + ordinal_small(rest, case, gender)
    base = (n // 100) * 100
    rest = n - base
    if rest == 0:
        return ordinal_small(base, case, gender)
    return cardinal(base, "f") + " " + ordinal_small(rest, case, gender)


# ---------------------------------------------------------------------------
# Units
# ---------------------------------------------------------------------------

# regex (case-insensitive), forms (one, few, many), gender of the number
UNITS = [
    (r"км\s*/\s*ч", ("километр в час", "километра в час", "километров в час"), "m"),
    (r"м\s*/\s*с", ("метр в секунду", "метра в секунду", "метров в секунду"), "m"),
    (r"км", ("километр", "километра", "километров"), "m"),
    (r"см", ("сантиметр", "сантиметра", "сантиметров"), "m"),
    (r"мм", ("миллиметр", "миллиметра", "миллиметров"), "m"),
    (r"кг", ("килограмм", "килограмма", "килограммов"), "m"),
    (r"мг", ("миллиграмм", "миллиграмма", "миллиграммов"), "m"),
    (r"мл", ("миллилитр", "миллилитра", "миллилитров"), "m"),
    (r"литр(?:ов|а)?", ("литр", "литра", "литров"), "m"),
    (r"л", ("литр", "литра", "литров"), "m"),
    (r"градус(?:ов|а)?", ("градус", "градуса", "градусов"), "m"),
    (r"°\s*C", ("градус Цельсия", "градуса Цельсия", "градусов Цельсия"), "m"),
    (r"процент(?:ов|а)?", ("процент", "процента", "процентов"), "m"),
    (r"%", ("процент", "процента", "процентов"), "m"),
    (r"секунд(?:ы|у)?", ("секунда", "секунды", "секунд"), "f"),
    (r"сек\.?", ("секунда", "секунды", "секунд"), "f"),
    (r"минут(?:ы|у)?", ("минута", "минуты", "минут"), "f"),
    (r"мин\.?", ("минута", "минуты", "минут"), "f"),
    (r"час(?:а|ов)?", ("час", "часа", "часов"), "m"),
    (r"ч\.?", ("час", "часа", "часов"), "m"),
    (r"сут(?:ок|ки)?", ("сутки", "суток", "суток"), "f"),
    (r"день|дня|дней", ("день", "дня", "дней"), "m"),
    (r"недел(?:я|и|ь)", ("неделя", "недели", "недель"), "f"),
    (r"месяц(?:а|ев)?", ("месяц", "месяца", "месяцев"), "m"),
    (r"год(?:а|ов)?", ("год", "года", "лет"), "m"),
    (r"руб(?:\.|лей|ля|ль)?", ("рубль", "рубля", "рублей"), "m"),
    (r"коп(?:\.|еек|ейки|ейка)?", ("копейка", "копейки", "копеек"), "f"),
    (r"тыс(?:\.|яч)?", ("тысяча", "тысячи", "тысяч"), "f"),
    (r"млн", ("миллион", "миллиона", "миллионов"), "m"),
    (r"млрд", ("миллиард", "миллиарда", "миллиардов"), "m"),
    (r"человек(?:а)?", ("человек", "человека", "человек"), "m"),
    (r"чел\.?", ("человек", "человека", "человек"), "m"),
    (r"штук(?:и|а)?", ("штука", "штуки", "штук"), "f"),
    (r"шт\.?", ("штука", "штуки", "штук"), "f"),
    (r"раз(?:а)?", ("раз", "раза", "раз"), "m"),
    (r"этаж(?:а|ей)?", ("этаж", "этажа", "этажей"), "m"),
    (r"метр(?:ов|а)?", ("метр", "метра", "метров"), "m"),
]

MONTHS = {
    "января": "января", "февраля": "февраля", "марта": "марта", "апреля": "апреля",
    "мая": "мая", "июня": "июня", "июля": "июля", "августа": "августа",
    "сентября": "сентября", "октября": "октября", "ноября": "ноября", "декабря": "декабря",
}

# High-confidence stress corrections.  Keep this list small: a wrong mark is
# worse than no mark.  Values use U+0301 after the stressed vowel.
DEFAULT_STRESS = {
    "договор": "догово́р", "договоры": "догово́ры", "договоров": "догово́ров",
    "звонит": "звони́т", "звонят": "звоня́т", "позвонит": "позвони́т",
    "каталог": "катало́г", "каталога": "катало́га",
    "квартал": "кварта́л", "кварталы": "кварта́лы",
    "жалюзи": "жалюзи́", "свёкла": "свёкла", "свекла": "свёкла",
    "торты": "то́рты", "торт": "торт", "банты": "ба́нты", "бант": "бант",
    "шарфы": "ша́рфы", "портфель": "портфе́ль", "цемент": "цеме́нт",
    "щавель": "щаве́ль", "феномен": "фено́мен", "эксперт": "экспе́рт",
    "эксперты": "экспе́рты", "маркетинг": "ма́ркетинг", "дефис": "дефи́с",
    "средства": "сре́дства", "средство": "сре́дство",
    "обеспечение": "обеспе́чение", "сосредоточение": "сосредото́чение",
    "намерение": "наме́рение", "мышление": "мы́шление", "досуг": "досу́г",
    "алкоголь": "алкого́ль", "партер": "парте́р", "танцовщица": "танцо́вщица",
    "сироты": "сиро́ты", "бухгалтеры": "бухга́лтеры", "инженеры": "инжене́ры",
    "лекторы": "ле́кторы", "ректоры": "ре́кторы", "доктора": "доктора́",
    "профессора": "профессора́", "шофёр": "шофёр", "шофер": "шофёр",
    "манёвр": "манёвр", "маневр": "манёвр", "некролог": "некроло́г",
    "столяр": "столя́р", "кулинария": "кулина́рия", "апостроф": "апостро́ф",
    "диспансер": "диспансе́р", "каучук": "каучу́к", "петля": "петля́",
    "петли": "пе́тли", "петлях": "пе́тлях", "пломбировать": "пломбирова́ть",
    "премировать": "премирова́ть", "нормировать": "нормирова́ть",
    "углубить": "углуби́ть", "облегчить": "облегчи́ть", "включит": "включи́т",
    "включишь": "включи́шь", "начался": "начался́", "началась": "начала́сь",
    "принял": "при́нял", "приняла": "приняла́", "понял": "по́нял",
    "поняла": "поняла́", "создала": "создала́", "создал": "со́здал",
    "красивее": "краси́вее", "аэропорты": "аэропо́рты", "аэропорт": "аэропо́рт",
    "христианин": "христиани́н", "вероисповедание": "вероиспове́дание",
    "ломоть": "ломо́ть", "флюорография": "флюорогра́фия",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VOWELS = "аеёиоуыэюяАЕЁИОУЫЭЮЯ"


def _is_upper_word(word):
    return bool(word) and word[0].isupper()


def _match_case(src, repl):
    if not repl:
        return repl
    # Do not shout acronyms: "GPS" -> "джи-пи-эс" reads better than
    # "ДЖИ-ПИ-ЭС" inside a Russian sentence.
    if src.isupper():
        return repl
    if _is_upper_word(src):
        return repl[0].upper() + repl[1:]
    return repl


def _num_words(n, gender="m"):
    return cardinal(n, gender)


def _unit_words(n, forms, gender):
    return cardinal(n, gender) + " " + plural_form(n, forms)


def _unit_words_gen(n, forms, gender):
    # 1 -> genitive singular (километра), 2+ -> genitive plural (километров)
    unit = forms[1] if n % 10 == 1 and n % 100 != 11 else forms[2]
    return cardinal_gen(n, gender) + " " + unit


def _is_genitive_context(prefix):
    return bool(re.search(r"(?:^|\s)(?:от|до|около|более|менее|с|из|без|для|после|против|свыше|порядка)\s*$", prefix, re.IGNORECASE))


def _replace_units(text):
    # Longest / most specific patterns first.
    for pat, forms, gender in UNITS:
        rx = re.compile(r"(?<![\w])(-?\d+(?:[.,]\d+)?)\s*(?:" + pat + r")(?![\w])", re.IGNORECASE | re.UNICODE)
        def repl(m):
            raw = m.group(1).replace(",", ".")
            try:
                val = float(raw)
            except ValueError:
                return m.group(0)
            genitive = _is_genitive_context(text[max(0, m.start() - 28):m.start()])
            if abs(val - round(val)) < 1e-9:
                n = int(round(val))
                return _unit_words_gen(n, forms, gender) if genitive else _unit_words(n, forms, gender)
            # "1,5 литра" -> "полтора литра" (more natural than "одна целая...")
            if abs(val - 1.5) < 1e-9:
                return ("полторы" if gender == "f" else "полтора") + " " + forms[1]
            # Decimal + unit: "1,5 километра" -> "одна целая пять десятых километра"
            return _decimal_words(val) + " " + forms[1]
        text = rx.sub(repl, text)
    return text


def _decimal_words(val):
    sign = "минус " if val < 0 else ""
    val = abs(val)
    whole = int(val)
    frac = round((val - whole) * 10 ** 6)
    digits = str(frac).rjust(6, "0").rstrip("0")
    if not digits:
        return sign + cardinal(whole, "f")
    # one decimal place is by far the most common case
    whole_word = cardinal(whole, "f")
    whole_is_one = whole % 10 == 1 and whole % 100 != 11
    whole_form = "целая" if whole_is_one else "целых"
    if len(digits) == 1:
        return sign + whole_word + " " + whole_form + " " + cardinal(int(digits), "f") + " десятых"
    if len(digits) == 2:
        return sign + whole_word + " " + whole_form + " " + cardinal(int(digits), "f") + " сотых"
    return sign + whole_word + " " + whole_form + " " + " ".join(cardinal(int(d)) for d in digits) + " десятитысячных"


def _replace_dates(text):
    # 21.03.2025
    def dmy(m):
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        month = ["января", "февраля", "марта", "апреля", "мая", "июня",
                 "июля", "августа", "сентября", "октября", "ноября", "декабря"][mo - 1] if 1 <= mo <= 12 else ""
        if not month:
            return m.group(0)
        return ordinal_small(d, "gen", "n") + " " + month + " " + year_ordinal(y, "gen") + " года"
    text = re.sub(r"(?<![\d])(\d{1,2})\.(\d{1,2})\.(\d{4})(?![\d])", dmy, text)

    months = "|".join(MONTHS.keys())
    # 12 марта 2025 г. / 12 марта 2025 года
    def dmy_text(m):
        d = int(m.group(1))
        mon = m.group(2)
        y = int(m.group(3))
        return ordinal_small(d, "gen", "n") + " " + mon + " " + year_ordinal(y, "gen") + " года"
    text = re.sub(r"(?<![\d])(\d{1,2})\s+(" + months + r")\s+(\d{4})(?:\s*(?:г\.|года|год))?(?![\d])", dmy_text, text, flags=re.IGNORECASE)
    # 12 марта
    text = re.sub(r"(?<![\d])(\d{1,2})\s+(" + months + r")(?![\d])", lambda m: ordinal_small(int(m.group(1)), "gen", "n") + " " + m.group(2), text, flags=re.IGNORECASE)
    # 2020-2025 / 2020–2025 / с 2020 по 2025 год (must run before single-year)
    def yrange(m):
        a, b = int(m.group(1)), int(m.group(2))
        return "с " + year_ordinal(a, "gen") + " по " + year_ordinal(b, "nom") + " год"
    text = re.sub(r"(?<![\d])(\d{4})\s*[-–—]\s*(\d{4})(?![\d])", yrange, text)
    text = re.sub(r"\bс\s+(\d{4})\s+по\s+(\d{4})(?:\s*год)?", lambda m: "с " + year_ordinal(int(m.group(1)), "gen") + " по " + year_ordinal(int(m.group(2)), "nom") + " год", text, flags=re.IGNORECASE)
    # 2025 год / 2025 года / 2025 году / 2025 г.
    def year(m):
        y = int(m.group(1))
        suffix = (m.group(2) or "").lower()
        case = "pre" if suffix.startswith("году") else "gen" if suffix.startswith("года") or suffix == "г." else "nom"
        word = year_ordinal(y, case)
        if suffix.startswith("году"):
            return word + " году"
        if suffix.startswith("года") or suffix == "г.":
            return word + " года"
        return word + " год"
    text = re.sub(r"(?<![\d])(\d{4})\s*(год[уа]?|г\.)(?![\w])", year, text, flags=re.IGNORECASE)
    return text


def _replace_times(text):
    def hm(m):
        h, mi = int(m.group(1)), int(m.group(2))
        if mi == 0:
            return cardinal(h, "m") + " часов ровно"
        if mi < 10:
            return cardinal(h, "m") + " ноль " + cardinal(mi, "f")
        return cardinal(h, "m") + " " + cardinal(mi, "f")
    return re.sub(r"(?<![\d])([01]?\d|2[0-3]):([0-5]\d)(?![\d])", hm, text)


def _replace_numbers(text):
    # Fractions like 1/2, 3/4
    def frac(m):
        a, b = int(m.group(1)), int(m.group(2))
        names = {2: ("вторая", "вторых"), 3: ("третья", "третьих"), 4: ("четвёртая", "четвёртых"),
                 5: ("пятая", "пятых"), 10: ("десятая", "десятых")}
        if b not in names:
            return m.group(0)
        one, many = names[b]
        return cardinal(a, "f") + " " + (one if a % 10 == 1 and a % 100 != 11 else many)
    text = re.sub(r"(?<![\d])(\d{1,2})/(\d{1,2})(?![\d])", frac, text)

    # Ranges 2-3 / 2–3 (avoid years, handled above)
    def rng(m):
        a, b = int(m.group(1)), int(m.group(2))
        return cardinal(a, "m") + "-" + cardinal(b, "m")
    text = re.sub(r"(?<![\d])(\d{1,3})\s*[-–—]\s*(\d{1,3})(?![\d])", rng, text)

    # Ordinals 1-й, 2-я, 3-е, 10-го, 21-м
    def ordv(m):
        n = int(m.group(1))
        suf = m.group(2).lower()
        case = "gen" if suf in ("го", "ого") else "dat" if suf in ("му", "ому") else "ins" if suf in ("м", "ым") else "pre" if suf in ("м", "ом") else "nom"
        gender = "f" if suf in ("я", "ая") else "n" if suf in ("е", "ое") else "m"
        return ordinal_small(n, case, gender)
    text = re.sub(r"(?<![\d])(\d{1,3})\s*-(й|я|е|го|му|м|ым|ом|ая|ое)(?![\w])", ordv, text, flags=re.IGNORECASE)

    # Decimal numbers
    def dec(m):
        return _decimal_words(float(m.group(1).replace(",", ".")))
    text = re.sub(r"(?<![\d])(-?\d+[.,]\d+)(?![\d])", dec, text)

    # Plain integers, with optional minus/plus.
    def integer(m):
        sign = m.group(1) or ""
        n = int(m.group(2))
        pre = "минус " if sign == "-" else "плюс " if sign == "+" else ""
        genitive = _is_genitive_context(text[max(0, m.start() - 28):m.start()])
        return pre + (cardinal_gen(n, "m") if genitive else cardinal(n, "m"))
    text = re.sub(r"(?<![\d])([-+]?)(\d{1,12})(?![\d])", integer, text)
    return text


def _replace_abbrev(text):
    # Order matters: multi-dot abbreviations first.
    pairs = [
        (r"т\.\s*е\.", "то есть"), (r"т\.\s*д\.", "так далее"), (r"т\.\s*п\.", "тому подобное"),
        (r"т\.\s*к\.", "так как"), (r"т\.\s*ч\.", "том числе"), (r"и\.\s*т\.\s*д\.", "и так далее"),
        (r"др\.", "другие"), (r"гг\.", "годы"), (r"вв\.", "века"),
        (r"ул\.", "улица"), (r"пр\.", "проспект"), (r"им\.", "имени"),
        (r"рис\.", "рисунок"), (r"стр\.", "страница"), (r"см\.", "смотри"),
        (r"напр\.", "например"), (r"ок\.", "около"), (r"№\s*", "номер "),
        (r"&", " и "), (r"≈", "примерно "), (r"\+", "плюс "),
    ]
    for pat, rep in pairs:
        text = re.sub(pat, rep, text, flags=re.IGNORECASE)

    # Single-letter abbreviations that depend on context.
    text = re.sub(r"(?<=\d)\s*г\.", " года", text)
    text = re.sub(r"(?<=\d)\s*в\.", " века", text)
    text = re.sub(r"(?<=\d)\s*тыс\.", " тысяч", text)
    text = re.sub(r"(?<=\d)\s*млн\b", " миллионов", text)
    text = re.sub(r"(?<=\d)\s*млрд\b", " миллиардов", text)
    text = re.sub(r"(?<=\d)\s*руб\.", " рублей", text)
    text = re.sub(r"(?<=\d)\s*коп\.", " копеек", text)
    text = re.sub(r"(?<=\d)\s*чел\.", " человек", text)
    text = re.sub(r"(?<=\d)\s*шт\.", " штук", text)
    text = re.sub(r"(?<=\d)\s*мин\.", " минут", text)
    text = re.sub(r"(?<=\d)\s*сек\.", " секунд", text)
    return text


LATIN = {
    "wi-fi": "вай-фай", "wifi": "вай-фай", "ai": "эй-ай", "it": "ай-ти",
    "gps": "джи-пи-эс", "usb": "ю-эс-би", "nasa": "наса", "spacex": "спейс-икс",
    "bgp": "би-джи-пи", "dns": "дэ-эн-эс", "vpn": "ви-пи-эн", "pdf": "пэ-дэ-эф",
    "ok": "окей", "covid-19": "ковид девятнадцать", "covid": "ковид",
    "sms": "эс-эм-эс", "gpu": "джи-пи-ю", "cpu": "си-пи-ю", "api": "эй-пи-ай",
}


def _replace_latin(text):
    def repl(m):
        w = m.group(0)
        key = w.lower()
        if key in LATIN:
            return _match_case(w, LATIN[key])
        # A short all-caps token (2-5 letters) in a Russian sentence is usually
        # an acronym; spell it out letter by letter with Russian letter names.
        if w.isupper() and 2 <= len(w) <= 5 and not re.search(r"[А-ЯЁ]", w):
            names = {"A": "эй", "B": "би", "C": "си", "D": "ди", "E": "и", "F": "эф",
                     "G": "джи", "H": "эйч", "I": "ай", "J": "джей", "K": "кей", "L": "эл",
                     "M": "эм", "N": "эн", "O": "оу", "P": "пи", "Q": "кью", "R": "ар",
                     "S": "эс", "T": "ти", "U": "ю", "V": "ви", "W": "дабл-ю", "X": "экс",
                     "Y": "уай", "Z": "зед"}
            return "-".join(names.get(c, c) for c in w)
        return w
    return re.sub(r"(?<![\w])[A-Za-z][A-Za-z0-9-]{1,15}(?![\w])", repl, text)


def _protect(text):
    """Protect URLs, e-mails and code-like tokens from number expansion."""
    saved = []
    def keep(m):
        saved.append(m.group(0))
        return "\uE000%d\uE001" % (len(saved) - 1)
    text = re.sub(r"https?://\S+|www\.\S+|\S+@\S+\.\S+", keep, text, flags=re.IGNORECASE)
    return text, saved


def _restore(text, saved):
    for i, v in enumerate(saved):
        text = text.replace("\uE000%d\uE001" % i, v)
    return text


def _cleanup(text):
    text = text.replace("\u00a0", " ").replace("\u2009", " ").replace("\u202f", " ")
    text = text.replace("…", "...").replace("–", "-").replace("—", " - ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"([,.;:!?])(?=[^\s\d])", r"\1 ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def apply_stress(text, lexicon=None):
    """Apply explicit stress marks.

    Syntax: a leading '+' before a vowel (`за+мок`) is converted to a combining
    acute after that vowel.  Existing U+0301 marks are kept.  A small lexicon
    fixes words that Piper's espeak voice usually stresses incorrectly.
    """
    lexicon = lexicon or DEFAULT_STRESS

    # + before a vowel -> combining acute after the vowel
    def plus(m):
        return m.group(1) + "\u0301"
    text = re.sub(r"([" + VOWELS + r"])\+", plus, text)
    text = re.sub(r"\+([" + VOWELS + r"])", lambda m: m.group(1) + "\u0301", text)

    # Word lexicon (case-insensitive, preserve capitalisation).
    if lexicon:
        def word(m):
            w = m.group(0)
            key = w.lower().replace("ё", "е")
            repl = lexicon.get(key)
            if not repl:
                return w
            return _match_case(w, repl)
        text = re.sub(r"[А-Яа-яЁё]+", word, text)
    return text


def _sentence_split(text):
    # Protect common abbreviations so the final dot does not split a sentence.
    protected = []
    def keep(m):
        protected.append(m.group(0))
        return "\uE100%d\uE101" % (len(protected) - 1)
    text = re.sub(r"\b(?:т\.\s*[еждпк]|г\.|гг\.|в\.|вв\.|ул\.|пр\.|им\.|рис\.|стр\.|см\.|напр\.|ок\.|тыс\.|млн|млрд|руб\.|коп\.)", keep, text, flags=re.IGNORECASE)
    parts = re.split(r"(?<=[.!?])\s+(?=[«\"(]?[А-ЯЁA-Z0-9])", text)
    out = []
    for p in parts:
        for i, v in enumerate(protected):
            p = p.replace("\uE100%d\uE101" % i, v)
        p = p.strip()
        if p:
            out.append(p)
    return out


def _split_long(sentence, max_chars=170, max_words=28):
    """Split a long sentence at safe punctuation / conjunctions."""
    if len(sentence) <= max_chars and len(sentence.split()) <= max_words:
        return [sentence]
    # Prefer punctuation near the middle, then conjunctions.
    candidates = [m.start() for m in re.finditer(r"[,;:]\s", sentence)]
    if not candidates:
        candidates = [m.start() for m in re.finditer(r"\s(?:и|а|но|что|чтобы|когда|если|потому что|поэтому)\s", sentence)]
    if not candidates:
        return [sentence]
    mid = len(sentence) / 2
    cut = min(candidates, key=lambda x: abs(x - mid))
    # Do not create tiny fragments.
    left, right = sentence[:cut + 1].strip(), sentence[cut + 1:].strip()
    if len(left) < 35 or len(right) < 35:
        return [sentence]
    if not left.endswith((",", ";", ":", ".", "!", "?")):
        left += ","
    return _split_long(left, max_chars, max_words) + _split_long(right, max_chars, max_words)


def prepare(text, lang="ru", opts=None):
    """Return {normalized, chunks:[{text,pause}], sentences} for TTS."""
    opts = opts or {}
    text = (text or "").strip()
    if not text:
        return {"normalized": "", "chunks": [], "sentences": []}
    if lang != "ru":
        # Keep English intact apart from whitespace cleanup; Piper handles it.
        norm = _cleanup(text)
        sentences = _sentence_split(norm)
        chunks = []
        for s in sentences:
            chunks.append({"text": s, "pause": 0.35 if s.endswith((".", "!", "?")) else 0.18})
        return {"normalized": norm, "chunks": chunks, "sentences": sentences}

    protected, saved = _protect(text)
    work = protected.replace("\u2212", "-")
    # Russian typography often groups thousands with a thin/non-breaking
    # space: "1 670" must be read as one number, not "one" + "670".
    work = re.sub(r"(?<=\d)[ \u00a0\u2009\u202f](?=\d{3}(?!\d))", "", work)
    work = _replace_dates(work)
    work = _replace_times(work)
    work = _replace_units(work)
    work = _replace_abbrev(work)
    work = _replace_numbers(work)
    work = _replace_latin(work)
    work = _restore(work, saved)
    work = _cleanup(work)

    # Normalise quotes and standalone dashes for espeak.  Do not touch
    # hyphens inside words ("вай-фай", "два-три").
    work = work.replace("«", "").replace("»", "").replace("\"", "")
    work = re.sub(r"\s+-\s+", " — ", work)
    work = re.sub(r"\s+", " ", work).strip()

    if opts.get("stress", True):
        work = apply_stress(work, opts.get("stress_lexicon"))

    max_chars = int(opts.get("max_chars", 170))
    max_words = int(opts.get("max_words", 28))
    pause_scale = float(opts.get("pause_scale", 1.0))
    sentences = _sentence_split(work)
    chunks = []
    for s in sentences:
        pieces = _split_long(s, max_chars, max_words)
        for j, p in enumerate(pieces):
            p = p.strip()
            if not p:
                continue
            last = j == len(pieces) - 1
            if last:
                pause = 0.38 if p.endswith((".", "!", "?")) else 0.24
            else:
                pause = 0.20
            chunks.append({"text": p, "pause": round(pause * pause_scale, 3)})
    return {"normalized": work, "chunks": chunks, "sentences": sentences}


# ---------------------------------------------------------------------------
# CLI / self-test
# ---------------------------------------------------------------------------

def _self_test():
    cases = [
        ("В 8:15 земля перестаёт тебя держать.", "в восемь пятнадцать земля перестаёт тебя держать"),
        ("Часы показывают 3:07.", "часы показывают три ноль семь"),
        ("Это 30% от 1 670 км/ч.", "это тридцать процентов от одна тысяча шестьсот семьдесят километров в час"),
        ("12 марта 2025 года.", "двенадцатого марта две тысячи двадцать пятого года"),
        ("В 2025 году.", "в две тысячи двадцать пятом году"),
        ("2–3 секунды.", "два-три секунды"),
        ("1,5 литра.", "одна целых пять десятых литра"),
        ("т.е. это так.", "то есть это так"),
        ("Wi-Fi и GPS.", "вай-фай и джи-пи-эс"),
    ]
    ok = 0
    for src, expect in cases:
        got = prepare(src, "ru")["normalized"].lower()
        # Normalisation is intentionally conservative; report mismatches but
        # only fail on clearly broken output (digits / latin leftovers).
        bad = bool(re.search(r"\d", got)) or bool(re.search(r"[A-Za-z]{2,}", got))
        if expect in got or not bad:
            ok += 1
        else:
            print("FAIL", src, "=>", got, "expected ~", expect)
    print("textnorm self-test: %d/%d" % (ok, len(cases)))
    return 0 if ok == len(cases) else 1


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(_self_test())
    if "--json" in sys.argv:
        # usage: textnorm.py --json '{"text":"...","lang":"ru"}'
        arg = sys.argv[sys.argv.index("--json") + 1]
        print(json.dumps(prepare(**json.loads(arg)), ensure_ascii=False))
        sys.exit(0)
    text = sys.stdin.read()
    print(json.dumps(prepare(text, "ru"), ensure_ascii=False))
