import { MidiShowDownloader } from './midishow-downloader';
import * as fs from 'node:fs';

const saveFile = async function(file: Promise<string>, id: number) {
    if (!fs.existsSync('./midi')) {
        fs.mkdirSync('./midi');
    }
    fs.writeFileSync(`./midi/${id}.mid`, await file, 'binary');
}

const downloader = new MidiShowDownloader();

async function main() {
    downloader.login('your username or email', 'your password')
        .then(() => {
            saveFile(
                downloader.getMidiFile(170992), 170992
            );
        })
}

main()
    .catch(console.error);