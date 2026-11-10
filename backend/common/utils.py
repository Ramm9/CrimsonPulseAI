import re
import secrets
import hashlib
import uuid

def generate_id(prefix: str = '') -> str:
    """
    Generate a clean entity ID matching the CrimsonPulse prefix convention.
    Example: generate_id('proj') -> 'proj_a8f9c2d1e4'
    """
    random_hex = uuid.uuid4().hex[:12]
    if prefix:
        return f"{prefix}_{random_hex}"
    return random_hex

def normalize_path(path: str) -> str:
    """
    Normalizes a path by replacing numeric IDs, UUIDs, MongoDB ObjectIDs,
    and cleaning Django regex routes into standardized OpenAPI placeholders '{id}'.
    Ensures safe, bounded endpoint discovery in PostgreSQL without regex artifacts.
    Examples:
      /api/houses/1500/ -> /api/houses/{id}/
      ^api/houses/$ -> /api/houses/
      ^api/houses/(?P<pk>[^/.]+)/$ -> /api/houses/{id}/
      /api/houses/(/ -> /api/houses/{id}/
      /api/houses/$/ -> /api/houses/
      /api/users/7f9a12c8-8921-4f30-8012-984218a00192/ -> /api/users/{id}/
    """
    if not path:
        return '/'

    p = str(path).strip()

    # 1. Strip query string (if present outside of regex patterns)
    if '?' in p and not re.search(r'\(\?[P:=!]', p):
        p = p.split('?')[0].strip()

    # 2. Strip regex start/end markers
    p = re.sub(r'^\^', '', p)
    p = re.sub(r'\$$', '', p)

    # 3. Clean Django regex named groups: e.g. (?P<pk>[^/.]+) or (?P<id>\d+) -> {id}
    p = re.sub(r'\(\?P<[a-zA-Z_0-9]+>[^)]+\)', '{id}', p)
    # Clean generic regex groups: e.g. ([0-9]+) or ([^/.]+) -> {id}
    p = re.sub(r'\([^)]+\)', '{id}', p)

    # 4. Clean Django 2+ path converters: e.g. <int:pk>, <uuid:id>, <slug:slug> -> {id}
    p = re.sub(r'<(?:[a-zA-Z_0-9]+:)?([a-zA-Z_0-9]+)>', '{id}', p)

    # 5. Clean legacy truncated regex fragments like /(
    p = re.sub(r'/\(/', '/{id}/', p)
    p = re.sub(r'/\($', '/{id}/', p)

    # 6. Clean standalone regex characters that leaked into path
    p = p.replace('^', '').replace('$', '').replace('(', '').replace(')', '')

    # 6. Ensure leading slash and remove duplicates
    if not p.startswith('/'):
        p = '/' + p
    p = re.sub(r'/+', '/', p)

    # 7. Normalize trailing slash consistency
    if not p.endswith('/'):
        p = p + '/'

    # 8. Replace UUIDs (e.g. 123e4567-e89b-12d3-a456-426614174000)
    p = re.sub(
        r'/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/',
        '/{id}/',
        p,
    )

    # 9. Replace numeric IDs (e.g. /12345/)
    p = re.sub(r'/\d+/', '/{id}/', p)

    # 10. Replace 24-character hex Mongo/ObjectId or SHA hashes
    p = re.sub(r'/[0-9a-fA-F]{24,64}/', '/{id}/', p)

    # 11. Clean double placeholders if any were generated (e.g. /{id}/{id}/)
    p = re.sub(r'/\{id\}(/\{id\})+/', '/{id}/', p)

    return p

def hash_api_key(raw_key: str) -> str:
    """
    Cryptographically hashes an API key for storage.
    Uses SHA-256 for fast, deterministic indexing while preventing plaintext key exposure.
    """
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()

def generate_api_key(environment: str = 'production') -> tuple[str, str, str, str]:
    """
    Generates a cryptographically secure, high-entropy API key.
    Returns:
      (full_secret_key, prefix, masked_key, hashed_key)
    Example:
      full_secret_key: cpk_live_d812a... (64 chars)
      prefix: cpk_live
      masked_key: cpk_live_****7e91
      hashed_key: sha256_hash
    """
    env_tag = 'live' if environment == 'production' else 'stg'
    prefix = f"cpk_{env_tag}"
    entropy = secrets.token_hex(24) # 48 hex characters
    full_key = f"{prefix}_{entropy}"
    masked_key = f"{prefix}_****{entropy[-4:]}"
    hashed_key = hash_api_key(full_key)

    return full_key, prefix, masked_key, hashed_key

