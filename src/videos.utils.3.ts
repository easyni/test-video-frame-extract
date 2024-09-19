import extractFrames from 'ffmpeg-extract-frames';

export const extractFrameFromVideo = async (
  url: string,
  time: number,
  outputPath: string,
): Promise<void> => {
  await extractFrames({
    input: url,
    output: outputPath,
    offsets: [663000],
  });
};
