import { join } from 'path';
import { extractFrameFromVideo } from './videos.utils.2';

// here your code.
function init() {
  console.log('Starting my script ...');
  const videoUrl =
    'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'; // URL of the online video
  const time = 719; // Time position to extract the frame (HH:MM:SS)
  const outputPath = join(process.cwd(), 'test.jpg'); // Output image file path

  extractFrameFromVideo(videoUrl, time, outputPath)
    .then(() => {
      console.log('Frame extraction completed');
    })
    .catch((error) => {
      console.error('Frame extraction failed', error);
    });
}

init();
