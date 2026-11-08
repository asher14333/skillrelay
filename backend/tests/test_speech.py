import base64
import io
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import speech
from ai_provider import AIProviderError


def response(pcm=b'\x00\x00\x01\x00', mime='audio/L16;codec=pcm;rate=24000', **changes):
    candidate = {'finishReason': 'STOP', 'content': {'parts': [{'inlineData': {
        'mimeType': mime, 'data': base64.b64encode(pcm).decode(),
    }}]}, **changes}
    return {'candidates': [candidate]}


def transport(envelope):
    return io.BytesIO(json.dumps(envelope).encode())


class GeminiSpeechTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'GEMINI_API_KEY': 'private-fixture-key'}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        speech._cache.clear()
        self.addCleanup(speech._cache.clear)

    def test_rest_contract_and_pcm_becomes_mono_wav(self):
        with patch.object(speech, 'urlopen', return_value=transport(response())) as network:
            audio = speech.synthesize_speech('What changes if there is no match?')
        req = network.call_args.args[0]
        self.assertEqual(req.full_url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent')
        self.assertNotIn('private-fixture-key', req.full_url)
        self.assertEqual(req.get_header('X-goog-api-key'), 'private-fixture-key')
        self.assertEqual(network.call_args.kwargs['timeout'], 60)
        body = json.loads(req.data)
        config = body['generationConfig']
        self.assertEqual(config['responseModalities'], ['AUDIO'])
        self.assertEqual(config['speechConfig']['voiceConfig']['prebuiltVoiceConfig']['voiceName'], 'Kore')
        self.assertIn('What changes if there is no match?', body['contents'][0]['parts'][0]['text'])
        with wave.open(io.BytesIO(audio), 'rb') as wav:
            self.assertEqual(wav.getnchannels(), 1)
            self.assertEqual(wav.getsampwidth(), 2)
            self.assertEqual(wav.getframerate(), 24000)
            self.assertEqual(wav.getnframes(), 2)
            self.assertEqual(wav.readframes(2), b'\x00\x00\x01\x00')

    def test_rate_is_read_from_mime_not_assumed(self):
        with patch.object(speech, 'urlopen', return_value=transport(response(mime='audio/pcm;rate=16000;channels=1'))):
            audio = speech.synthesize_speech('Question')
        with wave.open(io.BytesIO(audio), 'rb') as wav:
            self.assertEqual(wav.getframerate(), 16000)

    def test_valid_wav_response_is_not_double_wrapped(self):
        output = io.BytesIO()
        with wave.open(output, 'wb') as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(24000)
            wav.writeframes(b'\x00\x00' * 3)
        original = output.getvalue()
        with patch.object(speech, 'urlopen', return_value=transport(response(original, 'audio/wav'))):
            self.assertEqual(speech.synthesize_speech('Question'), original)

    def test_pcm_parts_join_and_thoughts_are_excluded(self):
        envelope = response()
        envelope['candidates'][0]['content']['parts'].insert(0, {'thought': True, 'inlineData': {'data': 'bad'}})
        envelope['candidates'][0]['content']['parts'].append({'inlineData': {'mimeType': 'audio/L16;codec=pcm;rate=24000', 'data': 'AgA='}})
        with patch.object(speech, 'urlopen', return_value=transport(envelope)):
            audio = speech.synthesize_speech('Question')
        with wave.open(io.BytesIO(audio), 'rb') as wav:
            self.assertEqual(wav.getnframes(), 3)
            self.assertEqual(wav.readframes(3), b'\x00\x00\x01\x00\x02\x00')

    def test_text_validation_never_requests_network(self):
        for text in (None, {}, 3, '', '  ', 'x' * 1801):
            with self.subTest(text_type=type(text)), patch.object(speech, 'urlopen') as network:
                with self.assertRaises(ValueError): speech.synthesize_speech(text)
                network.assert_not_called()

    def test_invalid_configuration_never_requests_network(self):
        for env in ({}, {'GEMINI_API_KEY': ''}, {'GEMINI_API_KEY': 'fixture', 'GEMINI_TTS_MODEL': '../bad?key=secret'},
                    {'GEMINI_API_KEY': 'fixture', 'GEMINI_TTS_VOICE': 'Unknown'}):
            with self.subTest(fields=list(env)), patch.dict(os.environ, env, clear=True), patch.object(speech, 'urlopen') as network:
                with self.assertRaises(AIProviderError) as caught: speech.synthesize_speech('Question')
                self.assertEqual(caught.exception.code, 'AI_NOT_CONFIGURED')
                network.assert_not_called()

    def test_model_voice_overrides_and_same_key_cache(self):
        with patch.dict(os.environ, {'GEMINI_TTS_MODEL': 'custom-tts', 'GEMINI_TTS_VOICE': 'Puck'}), \
                patch.object(speech, 'urlopen', side_effect=lambda *a, **k: transport(response())) as network:
            first = speech.synthesize_speech('Question')
            self.assertEqual(speech.synthesize_speech('Question'), first)
            self.assertEqual(network.call_count, 1)
            self.assertIn('/models/custom-tts:', network.call_args.args[0].full_url)
            config = json.loads(network.call_args.args[0].data)['generationConfig']
            self.assertEqual(config['speechConfig']['voiceConfig']['prebuiltVoiceConfig']['voiceName'], 'Puck')
        self.assertTrue(all(isinstance(key, bytes) and len(key) == 32 for key in speech._cache))

    def test_cache_is_scoped_to_key_model_voice_and_text(self):
        with patch.object(speech, 'urlopen', side_effect=lambda *a, **k: transport(response())) as network:
            speech.synthesize_speech('Question')
            with patch.dict(os.environ, {'GEMINI_API_KEY': 'other-fixture'}): speech.synthesize_speech('Question')
            with patch.dict(os.environ, {'GEMINI_TTS_MODEL': 'other-model'}): speech.synthesize_speech('Question')
            with patch.dict(os.environ, {'GEMINI_TTS_VOICE': 'Leda'}): speech.synthesize_speech('Question')
            speech.synthesize_speech('Other question')
            self.assertEqual(network.call_count, 5)
            with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
                with self.assertRaises(AIProviderError): speech.synthesize_speech('Question')

    def test_cache_expires_and_bounds_entries_and_bytes(self):
        with patch.object(speech.time, 'monotonic', return_value=10), \
                patch.object(speech, 'urlopen', side_effect=lambda *a, **k: transport(response())) as network:
            speech.synthesize_speech('Question')
            speech.synthesize_speech('Question')
            self.assertEqual(network.call_count, 1)
            with patch.object(speech.time, 'monotonic', return_value=400): speech.synthesize_speech('Question')
            self.assertEqual(network.call_count, 2)
        speech._cache.clear()
        with patch.object(speech, 'MAX_CACHE_ENTRIES', 2), patch.object(speech, 'MAX_CACHE_BYTES', 12):
            for index in range(4): speech._remember(bytes([index]), b'123456')
            self.assertEqual(len(speech._cache), 2)
            self.assertEqual(list(speech._cache), [b'\x02', b'\x03'])

    def test_malformed_audio_envelopes_are_rejected(self):
        envelopes = [None, [], {}, {'candidates': []}, response(finishReason='MAX_TOKENS'),
                     response(content={}), response(content={'parts': []}), response(b'abc'),
                     response(mime='audio/mpeg'), response(mime='audio/pcm'),
                     response(mime='audio/L16;rate=999999'), response(mime='audio/L16;rate=24000;channels=2'),
                     response(mime='audio/L16;rate=24000;codec=opus'), response(b'not-wav', 'audio/wav')]
        for envelope in envelopes:
            with self.subTest(shape=str(envelope)[:90]), patch.object(speech, 'urlopen', return_value=transport(envelope)):
                with self.assertRaises(AIProviderError) as caught: speech.synthesize_speech('Question')
                self.assertEqual(caught.exception.code, 'AI_INVALID_RESPONSE')
        self.assertEqual(len(speech._cache), 0)

    def test_invalid_base64_mixed_profiles_and_oversized_pcm_are_rejected(self):
        envelope = response()
        envelope['candidates'][0]['content']['parts'][0]['inlineData']['data'] = 'not_base64!'
        with patch.object(speech, 'urlopen', return_value=transport(envelope)):
            with self.assertRaises(AIProviderError): speech.synthesize_speech('Question')
        envelope = response()
        envelope['candidates'][0]['content']['parts'].append(response(mime='audio/L16;rate=16000')['candidates'][0]['content']['parts'][0])
        with patch.object(speech, 'urlopen', return_value=transport(envelope)):
            with self.assertRaises(AIProviderError): speech.synthesize_speech('Question')
        with patch.object(speech, 'MAX_AUDIO_BYTES', 2), patch.object(speech, 'urlopen', return_value=transport(response())):
            with self.assertRaises(AIProviderError): speech.synthesize_speech('Question')

    def test_oversized_or_non_json_wire_response_is_rejected(self):
        for body in (b'not-json', b'\xff', b'x' * (speech.MAX_RESPONSE_BYTES + 1)):
            with patch.object(speech, 'urlopen', return_value=io.BytesIO(body)):
                with self.assertRaises(AIProviderError): speech.synthesize_speech('Question')

    def test_upstream_errors_are_helpful_without_leaking_details(self):
        for status, code in ((400, 'AI_UNAVAILABLE'), (401, 'AI_AUTH_ERROR'), (403, 'AI_AUTH_ERROR'),
                             (404, 'AI_MODEL_NOT_FOUND'), (429, 'AI_RATE_LIMITED'), (500, 'AI_UNAVAILABLE')):
            with self.subTest(status=status), patch.object(speech, 'urlopen', side_effect=HTTPError('https://example.invalid', status, 'private-fixture-key response body', {}, None)):
                with self.assertRaises(AIProviderError) as caught: speech.synthesize_speech('Question')
                self.assertEqual(caught.exception.code, code)
                self.assertNotIn('private-fixture-key', str(caught.exception))
        for error in (TimeoutError('private-fixture-key'), URLError('private-fixture-key')):
            with patch.object(speech, 'urlopen', side_effect=error):
                with self.assertRaises(AIProviderError) as caught: speech.synthesize_speech('Question')
                self.assertEqual(caught.exception.code, 'AI_CONNECTION_ERROR')
                self.assertNotIn('private-fixture-key', str(caught.exception))


if __name__ == '__main__':
    unittest.main()
