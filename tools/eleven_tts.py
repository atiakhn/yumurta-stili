# eleven_tts.py — voice a script with the ElevenLabs API and write the word times from its own alignment
# (no Whisper needed: the API returns the start/end of every character it spoke).
#   python eleven_tts.py <script.txt> <voice_id> <out_dir> [speed=1.0] [model=eleven_multilingual_v2]
# Writes <out_dir>/voice.wav and <out_dir>/words.json (same format as kelime_saat.py).
# Key: ELEVENLABS_API_KEY (in the cloud session the network proxy injects it; any placeholder works).
import sys, os, json, base64, re, subprocess, urllib.request

script, voice, out = sys.argv[1], sys.argv[2], sys.argv[3]
speed = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
model = sys.argv[5] if len(sys.argv) > 5 else 'eleven_multilingual_v2'
text = open(script, encoding='utf-8').read().strip()
body = {'text': text, 'model_id': model,
        'voice_settings': {'stability': .45, 'similarity_boost': .8, 'style': .25, 'use_speaker_boost': True, 'speed': speed}}
req = urllib.request.Request(
    f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_192',
    data=json.dumps(body).encode(), method='POST',
    headers={'xi-api-key': os.environ.get('ELEVENLABS_API_KEY', 'proxy-injected'), 'Content-Type': 'application/json'})
r = json.load(urllib.request.urlopen(req, timeout=300))
os.makedirs(out, exist_ok=True)
mp3 = os.path.join(out, 'voice_raw.mp3')
open(mp3, 'wb').write(base64.b64decode(r['audio_base64']))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '48000', os.path.join(out, 'voice.wav')], check=True)

al = r.get('normalized_alignment') or r['alignment']
chars, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
spoken = ''.join(chars)
# walk the script's words through the aligned character string
words, pos = [], 0
for w in text.split():
    core = re.sub(r'^\W+|\W+$', '', w) or w
    i = spoken.find(core, pos)
    if i < 0:   # normalisation changed the word (numbers etc.): take the next non-space run
        i = pos
        while i < len(spoken) and spoken[i] == ' ': i += 1
        j = spoken.find(' ', i); j = len(spoken) if j < 0 else j
    else:
        j = i + len(core)
    words.append({'word': w, 'start': round(st[i], 3), 'end': round(en[max(i, j - 1)], 3)})
    pos = j
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                            os.path.join(out, 'voice.wav')], capture_output=True, text=True).stdout)
json.dump({'words': words, 'duration': round(dur, 3)}, open(os.path.join(out, 'words.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
gaps = [(words[i]['word'], round(words[i + 1]['start'] - words[i]['end'], 2)) for i in range(len(words) - 1)
        if words[i + 1]['start'] - words[i]['end'] > .35]
print(f'OK {len(words)} words, {dur:.2f}s, {len(words) / dur:.2f} words/s | gaps>0.35: {gaps}')
