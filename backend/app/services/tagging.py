import re
import unicodedata


MAX_AUTO_TAGS = 12

STOPWORDS = {
    "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos",
    "e", "em", "entre", "foi", "isso", "mais", "me", "na", "nas", "no", "nos",
    "o", "os", "para", "por", "que", "se", "sem", "sua", "suas", "te", "um",
    "uma", "umas", "uns", "eu", "hoje", "ontem", "muito", "minha", "meu", "minhas",
    "meus", "sobre", "até", "também", "mas", "ou", "quando", "depois", "antes",
}

CANONICAL_TERMS = {
    "academia": "exercício", "corrida": "corrida", "correr": "corrida", "caminhada": "caminhada",
    "caminhar": "caminhada", "treino": "exercício", "exercitei": "exercício", "estudei": "estudo",
    "estudar": "estudo", "li": "leitura", "livro": "leitura", "trabalho": "trabalho",
    "reunião": "reunião", "reuniao": "reunião", "família": "família", "familia": "família",
    "amigo": "amizade", "amigos": "amizade", "meditação": "meditação", "meditacao": "meditação",
    "sono": "sono", "viajem": "viagem", "viagem": "viagem", "ansioso": "ansiedade",
    "ansiedade": "ansiedade", "feliz": "bem-estar", "felicidade": "bem-estar",
}


def _key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.lower())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _display(value: str) -> str:
    return " ".join(value.strip().lower().split())


def extract_tags(text: str, explicit_tags: list[str] | None = None, limit: int = MAX_AUTO_TAGS) -> list[str]:
    """Extract deterministic, privacy-preserving tags from free text."""
    tags: list[str] = []
    seen: set[str] = set()

    def add(value: str) -> None:
        value = _display(value)
        key = _key(value)
        if not value or key in seen or len(value) < 3:
            return
        seen.add(key)
        tags.append(value)

    for tag in explicit_tags or []:
        add(tag)

    words = re.findall(r"#[\wÀ-ÿ]+|[\wÀ-ÿ]+", text.lower(), flags=re.UNICODE)
    for word in words:
        if word.startswith("#"):
            add(word[1:])
            continue
        if len(word) < 4 or _key(word) in STOPWORDS or word.isdigit():
            continue
        add(CANONICAL_TERMS.get(word, word))
        if len(tags) >= limit:
            break

    return tags[:limit]