// QWERTY keyboard layout mapping between English and Russian (ЙЦУКЕН)
// Each key maps to the character at the same physical position in the other layout.

const EN_TO_RU = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н',
  'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з', '[': 'х', ']': 'ъ',
  'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р',
  'j': 'о', 'k': 'л', 'l': 'д', ';': 'ж', "'": 'э',
  'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т',
  'm': 'ь', ',': 'б', '.': 'ю'
};

const RU_TO_EN = {
  'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y',
  'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p', 'х': '[', 'ъ': ']',
  'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h',
  'о': 'j', 'л': 'k', 'д': 'l', 'ж': ';', 'э': "'",
  'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n',
  'ь': 'm', 'б': ',', 'ю': '.'
};

/**
 * Translates a string from one keyboard layout to the other.
 * Each character is independently converted: English → Russian or Russian → English.
 * Characters that don't belong to either layout are kept as-is.
 *
 * @param {string} str - Lowercase string to translate
 * @returns {string} Translated string
 */
export function translateLayout(str) {
  return str.split('').map(ch => EN_TO_RU[ch] ?? RU_TO_EN[ch] ?? ch).join('');
}
