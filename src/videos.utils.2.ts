import ffmpeg from 'fluent-ffmpeg';
import { parse } from 'path';
// Function to extract a frame from an online video using partial download
export const extractFrameFromVideo = async (
  url: string,
  time: number,
  outputPath: string,
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const { dir, base } = parse(outputPath);
    console.time('Frame extraction time');
    // Use ffmpeg to extract the frame
    ffmpeg(url)
      .screenshots({
        folder: dir,
        filename: base,
        timestamps: [time],
      })
      .on('end', () => {
        console.timeEnd('Frame extraction time');
        resolve();
      })
      .on('error', (error) => {
        console.error('Error extracting frame', error);
        reject(error);
      });
  });
};
