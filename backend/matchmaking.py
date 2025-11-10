"""Event matchmaking tuned for a single Gemini round trip."""

from datetime import datetime
import json
from typing import Dict, Iterable, List, Tuple

from gemini import gemini

CORE_WEIGHT = 28
SECONDARY_WEIGHT = 12
LOCATION_WEIGHT = 15
LANGUAGE_WEIGHT = 10
NEWCOMER_WEIGHT = 10
AVOID_PENALTY = 25
RECENCY_BONUS = 5


def _listify(value) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [part.strip() for part in value.split(",") if part.strip()]
    return []


def _normalize_keywords(keywords: Iterable[str]) -> List[str]:
    seen = set()
    normalized = []
    for keyword in keywords:
        key = str(keyword).strip().lower()
        if key and key not in seen:
            seen.add(key)
            normalized.append(key)
    return normalized


def _extract_json_block(text: str) -> str:
    data = text.strip()
    if data.startswith("```json"):
        data = data[7:]
    if data.startswith("```"):
        data = data[3:]
    if data.endswith("```"):
        data = data[:-3]
    return data.strip()


def _status_keywords(status_code: str) -> List[str]:
    mapping = {
        "S": ["international student", "study permit"],
        "R": ["refugee", "settlement services"],
        "W": ["temporary worker", "work permit"],
        "P": ["permanent resident", "settler"],
    }
    return mapping.get(status_code, ["newcomer", "settler support"])


def _build_fallback_profile(user_profile: Dict) -> Dict:
    interests = _listify(user_profile.get("interests", []))
    occupation = str(user_profile.get("occupation", "")).strip()
    status = str(user_profile.get("status", "")).strip().upper()
    languages = _listify(user_profile.get("language") or user_profile.get("languages") or ["english"])
    location = str(user_profile.get("location", "")).strip()

    core = interests or []
    if occupation:
        core.append(occupation)
    core.extend(_status_keywords(status))

    fallback = {
        "core_keywords": _normalize_keywords(core),
        "secondary_keywords": _normalize_keywords(interests),
        "avoid_keywords": ["alcohol"],
        "preferred_location": location.lower(),
        "preferred_languages": _normalize_keywords(languages) or ["english"],
        "notes": "fallback profile built from stored attributes",
    }
    return fallback


def build_user_keyword_profile(user_profile: Dict) -> Dict:
    fallback = _build_fallback_profile(user_profile)

    prompt = f"""You design matchmaking keyword profiles for newcomers looking for local events.
Translate the profile below into structured keyword tiers that help filter events.

Return ONLY JSON with this shape (no commentary, no markdown):
{{
  "core_keywords": ["keyword"],
  "secondary_keywords": ["keyword"],
  "avoid_keywords": ["keyword"],
  "preferred_location": "one city or region keyword",
  "preferred_languages": ["language"],
  "notes": "Short guidance on the type of events to favour"
}}

Rules:
- Keywords should be lowercase, max three words each, no punctuation.
- Core keywords are must-haves; secondary keywords are nice-to-have themes.
- Avoid keywords should flag events to skip.
- Use information from the profile; do not invent unrelated items.

PROFILE
- Status: {user_profile.get('status', 'Unknown')}
- Occupation: {user_profile.get('occupation', 'Unknown')}
- Interests: {', '.join(_listify(user_profile.get('interests', []))) or 'None listed'}
- Location: {user_profile.get('location', 'Unknown')}
- Languages: {', '.join(_listify(user_profile.get('language') or user_profile.get('languages') or ['english']))}
- Background: {user_profile.get('bio') or user_profile.get('about') or 'N/A'}
"""

    try:
        response = gemini(prompt)
        if not response:
            raise ValueError("Gemini returned no content")

        parsed = json.loads(_extract_json_block(response))

        profile = {
            "core_keywords": _normalize_keywords(parsed.get("core_keywords", [])) or fallback["core_keywords"],
            "secondary_keywords": _normalize_keywords(parsed.get("secondary_keywords", [])) or fallback["secondary_keywords"],
            "avoid_keywords": _normalize_keywords(parsed.get("avoid_keywords", [])) or fallback["avoid_keywords"],
            "preferred_location": str(parsed.get("preferred_location", fallback["preferred_location"])).strip().lower(),
            "preferred_languages": _normalize_keywords(parsed.get("preferred_languages", fallback["preferred_languages"])) or fallback["preferred_languages"],
            "notes": str(parsed.get("notes", fallback.get("notes", ""))).strip() or fallback.get("notes", ""),
        }
        return profile
    except Exception as exc:
        print(f"Keyword profile fallback: {exc}")
        return fallback


def _event_corpus(event: Dict) -> Tuple[str, Dict[str, str]]:
    fields = {
        "name": str(event.get("name", "")),
        "about": str(event.get("about", "")),
        "venue": str(event.get("venue", "")),
        "category": str(event.get("category", "")),
        "tags": " ".join(_listify(event.get("tags", []))),
        "language": str(event.get("language", "")),
        "date": str(event.get("date", "")),
    }
    corpus = " ".join(fields.values()).lower()
    return corpus, fields


def _score_event(event: Dict, user_profile: Dict, keyword_profile: Dict) -> Dict:
    corpus, fields = _event_corpus(event)
    core_hits = [kw for kw in keyword_profile["core_keywords"] if kw in corpus]
    secondary_hits = [kw for kw in keyword_profile["secondary_keywords"] if kw in corpus and kw not in core_hits]
    avoid_hits = [kw for kw in keyword_profile["avoid_keywords"] if kw in corpus]

    score = 0
    reasons: List[str] = []

    if core_hits:
        score += min(len(core_hits) * CORE_WEIGHT, 60)
        reasons.append(f"Matches core themes: {', '.join(core_hits)}")

    if secondary_hits:
        score += min(len(secondary_hits) * SECONDARY_WEIGHT, 24)
        reasons.append(f"Nice-to-have overlaps: {', '.join(secondary_hits)}")

    location = keyword_profile.get("preferred_location")
    if location and location in corpus:
        score += LOCATION_WEIGHT
        reasons.append(f"In preferred location: {location}")

    languages = keyword_profile.get("preferred_languages", [])
    if any(lang in corpus for lang in languages):
        score += LANGUAGE_WEIGHT
        reasons.append("Language alignment")

    newcomer_terms = ["newcomer", "settlement", "immigrant", "international", "welcome"]
    if any(term in corpus for term in newcomer_terms):
        score += NEWCOMER_WEIGHT
        reasons.append("Newcomer friendly")

    if avoid_hits:
        score -= min(len(avoid_hits) * AVOID_PENALTY, 50)
        reasons.append(f"Avoid keywords present: {', '.join(avoid_hits)}")

    date_field = fields.get("date") or event.get("date")
    if date_field:
        try:
            when = datetime.fromisoformat(date_field.replace("Z", "+00:00"))
            now = datetime.now(when.tzinfo) if when.tzinfo else datetime.now()
            if when >= now:
                score += RECENCY_BONUS
        except Exception:
            pass

    score = max(0, min(100, score))
    reasoning = "; ".join(reasons) if reasons else "General relevance"
    factors = reasons or ["Relevant community event"]

    return {
        "score": score,
        "reasoning": reasoning,
        "relevance_factors": factors,
    }


def get_recommended_events_for_user(
    user_profile: Dict,
    all_events: List[Dict],
    min_score: float = 45.0,
    top_n: int = 5,
) -> List[Dict]:
    keyword_profile = build_user_keyword_profile(user_profile)
    scored_events = []

    for event in all_events:
        match = _score_event(event, user_profile, keyword_profile)
        if match["score"] >= min_score:
            enriched = event.copy()
            enriched["match_score"] = match["score"]
            enriched["match_reasoning"] = match["reasoning"]
            enriched["relevance_factors"] = match["relevance_factors"]
            enriched["match_notes"] = keyword_profile.get("notes", "")
            scored_events.append(enriched)

    scored_events.sort(key=lambda evt: evt.get("match_score", 0), reverse=True)
    return scored_events[:top_n]


def batch_score_events(user_profile: Dict, events: List[Dict]) -> List[Dict]:
    keyword_profile = build_user_keyword_profile(user_profile)
    scored = []

    for event in events:
        match = _score_event(event, user_profile, keyword_profile)
        enriched = event.copy()
        enriched["match_score"] = match["score"]
        enriched["match_reasoning"] = match["reasoning"]
        enriched["relevance_factors"] = match["relevance_factors"]
        enriched["match_notes"] = keyword_profile.get("notes", "")
        scored.append(enriched)

    scored.sort(key=lambda evt: evt.get("match_score", 0), reverse=True)
    return scored


def fallback_matching(user_profile: Dict, event: Dict) -> Dict:
    keyword_profile = _build_fallback_profile(user_profile)
    return _score_event(event, user_profile, keyword_profile)
