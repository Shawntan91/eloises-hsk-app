import os
import glob
import av

def compress_file(src_path, target_bitrate=64000, sample_rate=32000):
    tmp_path = src_path + ".tmp.mp3"
    
    inp = av.open(src_path)
    in_stream = inp.streams.audio[0]
    orig_duration = in_stream.duration * float(in_stream.time_base) if in_stream.duration else (inp.duration / 1000000.0 if inp.duration else 0)
    orig_size = os.path.getsize(src_path)

    # If file is already smaller than 10.5 MB and bitrate is around 64k or less, skip
    if orig_size < 10500000 and (orig_size / max(1, orig_duration)) < 9000:
        print(f"Skipping {os.path.basename(src_path)} (already optimal: {orig_size / 1024 / 1024:.2f} MB)")
        inp.close()
        return

    print(f"Compressing {os.path.basename(src_path)} ({orig_size / 1024 / 1024:.2f} MB, {orig_duration:.1f}s)...")

    out = av.open(tmp_path, mode='w', format='mp3')
    out_stream = out.add_stream('mp3', rate=sample_rate)
    out_stream.bit_rate = target_bitrate
    out_stream.layout = 'mono'

    resampler = av.AudioResampler(format='s16p', layout='mono', rate=sample_rate)

    for frame in inp.decode(in_stream):
        for r_frame in resampler.resample(frame):
            for packet in out_stream.encode(r_frame):
                out.mux(packet)

    for packet in out_stream.encode(None):
        out.mux(packet)

    inp.close()
    out.close()

    # Verify duration
    chk = av.open(tmp_path)
    chk_duration = chk.duration / 1000000.0 if chk.duration else 0
    new_size = os.path.getsize(tmp_path)
    chk.close()

    if orig_duration > 0 and abs(chk_duration - orig_duration) > 2.0:
        print(f"ERROR: Duration mismatch for {src_path}! Orig: {orig_duration}, New: {chk_duration}. Reverting!")
        os.remove(tmp_path)
        return

    # Replace original
    os.replace(tmp_path, src_path)
    print(f"Done: {orig_size / 1024 / 1024:.2f} MB -> {new_size / 1024 / 1024:.2f} MB (Saved {((orig_size - new_size) / orig_size) * 100:.1f}%)")

def main():
    audio_files = sorted(glob.glob("public/audio/*.mp3"))
    print(f"Found {len(audio_files)} audio files.")
    total_before = sum(os.path.getsize(f) for f in audio_files)
    print(f"Total size before: {total_before / 1024 / 1024:.2f} MB")

    for f in audio_files:
        try:
            compress_file(f, target_bitrate=64000, sample_rate=32000)
        except Exception as e:
            print(f"Error compressing {f}: {e}")

    total_after = sum(os.path.getsize(f) for f in audio_files)
    print(f"\n==========================================")
    print(f"Total size after: {total_after / 1024 / 1024:.2f} MB")
    print(f"Total saved: {(total_before - total_after) / 1024 / 1024:.2f} MB ({((total_before - total_after) / total_before) * 100:.1f}%)")

if __name__ == "__main__":
    main()
