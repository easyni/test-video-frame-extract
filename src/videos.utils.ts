import ffmpeg from 'fluent-ffmpeg';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import tmp from 'tmp';
import { writeFileSync } from 'fs';
import { join } from 'path';

const metadataRangeSize = 500000; // Download the first 500 KB for metadata

// Function to determine correct protocol and make HTTP requests
const getProtocol = (url: string) => {
  const parsedUrl = new URL(url);
  return parsedUrl.protocol === 'https:' ? https : http;
};

const getMetadataBuffer = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const protocol = getProtocol(url);
    const metadataRange = `bytes=0-${metadataRangeSize - 1}`;

    protocol
      .get(url, { headers: { Range: metadataRange } }, (metadataRes) => {
        const metadataBuffer: Buffer[] = [];

        metadataRes.on('data', (chunk) => {
          metadataBuffer.push(chunk);
        });

        metadataRes.on('end', () => {
          resolve(Buffer.concat(metadataBuffer));
        });
      })
      .on('error', reject);
  });
};

const getFrameBuffer = (url: string, range: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const protocol = getProtocol(url);

    protocol
      .get(url, { headers: { Range: range } }, (frameRes) => {
        const frameBuffer: Buffer[] = [];

        frameRes.on('data', (chunk) => {
          frameBuffer.push(chunk);
        });

        frameRes.on('end', () => {
          resolve(Buffer.concat(frameBuffer));
        });
      })
      .on('error', reject);
  });
};

const getVideoMetadata = async (
  metadataBuffer: Buffer,
): Promise<{
  duration: number;
  biteRate: number;
}> => {
  const tempFileMetadata = tmp.fileSync({ postfix: '.mp4' });
  writeFileSync(tempFileMetadata.name, metadataBuffer);
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(tempFileMetadata.name, (err, metadata) => {
      if (err) {
        reject(err);
      }
      resolve({
        duration: metadata.format.duration ?? 0,
        biteRate: metadata.format.bit_rate ?? 0,
      });
      tempFileMetadata.removeCallback();
    });
  });
};

const getContentLength = (url: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const protocol = getProtocol(url);

    protocol
      .get(url, { method: 'HEAD' }, (res) => {
        const contentLength = parseInt(res.headers['content-length'] || '0');
        resolve(contentLength);
      })
      .on('error', reject);
  });
};

const calculateByteRange = async (
  time: number,
  totalDuration: number,
  contentLength: number,
  biteRate: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (contentLength === 0) {
      return reject(new Error('Could not retrieve video size'));
    }
    const startByte = time * biteRate;
    const endByte = startByte + biteRate;
    resolve(`bytes=${startByte}-${endByte}`);
  });
};

// Function to extract a frame from an online video using partial download
export const extractFrameFromVideo = async (
  url: string,
  time: number,
  outputPath: string,
): Promise<void> => {
  console.time('Frame extraction time');
  return new Promise(async (resolve, reject) => {
    // Create a temporary file for the partial video
    // const tempFile = tmp.fileSync({ postfix: '.mp4' });
    const tempFilePath = join(process.cwd(), 'temp.mp4');
    const metadataBuffer = await getMetadataBuffer(url);
    const { duration, biteRate } = await getVideoMetadata(metadataBuffer);
    console.log('Total video duration:', duration, biteRate);
    const contentLength = await getContentLength(url);
    console.log('Video content length:', contentLength);
    const range = await calculateByteRange(
      time,
      duration,
      contentLength,
      biteRate,
    );
    const frameBuffer = await getFrameBuffer(url, range);
    console.log('frameBuffer downloaded successfully', frameBuffer);
    const timeExtraction = Math.ceil(
      (metadataRangeSize * duration) / contentLength,
    );
    console.log('Time extraction:', timeExtraction);

    // Write metadata and video data to the temporary file
    writeFileSync(tempFilePath, Buffer.concat([metadataBuffer, frameBuffer]));

    // Use ffmpeg to extract the frame
    ffmpeg(tempFilePath)
      .seekInput(timeExtraction + 1) // Seek to the desired time in the partial video
      .frames(1) // Capture only one frame
      .output(outputPath) // Output image file path
      .on('end', () => {
        console.log('Frame extracted successfully');
        // tempFile.removeCallback(); // Cleanup temporary file
        console.timeEnd('Frame extraction time');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error extracting frame:', err);
        // tempFile.removeCallback(); // Cleanup temporary file
        reject(err);
      })
      .run();
  });
};
