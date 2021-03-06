import { Component, OnInit } from '@angular/core';

// Services
import { AudioService } from 'src/app/services/audio/audio.service';
import { SongDataService } from 'src/app/services/songData/song-data.service';

// State
import { AudioState } from 'src/app/interfaces/audio-state';

// Packages
import { Capacitor } from '@capacitor/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Platform } from '@ionic/angular';

import { BACKEND_ANDROID_SERVER, BACKEND_SERVER } from 'src/app/constants';

@Component({
  selector: 'app-player',
  templateUrl: './player.page.html',
  styleUrls: ['./player.page.scss'],
})
export class PlayerPage implements OnInit {

  files: Array<any> = [];
  state: AudioState;
  currentFile: any = {};
  currentPlt: any[] = [];
  isOnline = false;
  isWav = false;
  wavToggle = false;
  oggToggle = false;
  bitRate = '320';
  format = 'mp3';
  currentSongInfo: any =  {image: 'assets/temp.jpg'};

  constructor(
    public audioService: AudioService,
    public songDataService: SongDataService,
    private httpClient: HttpClient,
    private plt: Platform,
    private http: HttpClient
  ) {

    // Get Media Files
    songDataService.getFiles().subscribe(files => {
      this.files = files;
    });

    // listen to stream state
    this.audioService.getState().subscribe(state => {
      this.state = state;
    });


    this.currentPlt = plt.platforms();

  }

  ngOnInit() {
  }

  openFile(file, index) {
    this.currentFile = { index, file };
    this.audioService.stop();

    //console.log(file.sourceType);

    if (file.sourceType === 'online') {
      console.log('Hello This is Online');
      const src = file.source;
      let tempUrl2 = '';
      let imgUrl = '';
      let infoUrl = '';

      console.log(this.currentPlt);

      this.isOnline = true;


      /*
      This is the path to get files from the backend (MUST RUN IONIC CAP RUN ANDROID --EXTERNAL)
      Localhost is used for the android emulator and so if it tries to access a file on the localhost it checks the phone
      To bypass this 10.0.2.2 is used however WE MIGHT RUN THE BACKEND ON DIGITALOCEAN
      */
      if (this.currentPlt[0] === 'android') {

        tempUrl2 = `${BACKEND_ANDROID_SERVER}/song/stream?s=${file.onlineId}&f=${this.format}&b=${this.bitRate}`;
        imgUrl = `${BACKEND_ANDROID_SERVER}/song/image?id=${file.onlineId}`;
        infoUrl = `${BACKEND_ANDROID_SERVER}/song/get?id=${file.onlineId}`;

      } else {

        tempUrl2 = `${BACKEND_SERVER}/song/stream?s=${file.onlineId}&b=${this.bitRate}&f=${this.format}`;
        imgUrl = `${BACKEND_SERVER}/song/image?id=${file.onlineId}`;
        infoUrl = `${BACKEND_SERVER}/song/get?id=${file.onlineId}`;

      }

      fetch(imgUrl, {})
      .then((res) => {
        res.blob().then(blob => {
          const imgUrl2 = URL.createObjectURL(blob);
          this.currentSongInfo.image = imgUrl2;
        });
      });

      fetch(infoUrl, {})
      .then ((result) => {
        result.json().then(data => {
          this.currentSongInfo.title = data.title;
          this.currentSongInfo.artist = data.artist;
          this.currentSongInfo.genre = data.genre;
          this.isWav = data.isWav;
        });
      });

      fetch(tempUrl2, {})
      .then((res) => {
        res.blob().then(blob => {
          const tempUrl3 = URL.createObjectURL(blob);
          this.playStream(tempUrl3);
        });
      });

    } else {

      this.isOnline = false;
      this.isWav = false;

      this.currentSongInfo.image = 'assets/temp.jpg';
      this.currentSongInfo.title = this.currentFile.file.title;
      this.currentSongInfo.artist = this.currentFile.file.artist;
      this.currentSongInfo.genre = this.currentFile.file.genre;
      console.log(this.currentFile);
      const tempUrl = Capacitor.convertFileSrc(file.source);

      this.playStream(tempUrl);
    }
  }

  playStream(url) {
    this.audioService.playStream(url, this.state.shuffle, this.state.repeat).subscribe(events => {
      // listening for fun here
      if (this.state.songEnd === true && this.isLastPlaying() === false) {
        this.next();
      }
    });
  }

  pause() {
    this.audioService.pause();
  }

  play() {
    this.audioService.play();
  }

  stop() {
    this.audioService.stop();
  }

  next() {

    if (this.state.repeat) {
      return this.repeat();
    }
    if (this.state.shuffle) {
      return this.shuffle();
    }

    const index = this.currentFile.index + 1;
    const file = this.files[index];
    this.openFile(file, index);
  }

  previous() {

    if (this.state.repeat) {
      return this.repeat();
    }
    if (this.state.shuffle) {
      return this.shuffle();
    }

    const index = this.currentFile.index - 1;
    const file = this.files[index];
    this.openFile(file, index);
  }

  isFirstPlaying() {
    return this.currentFile.index === 0;
  }
  isLastPlaying() {
    return this.currentFile.index === this.files.length - 1;
  }

  onSliderChangeStart(){
    this.state.onSeekState = this.state.playing;
    if(this.state.onSeekState) {
      this.pause();
    }
  }

  onSliderChangeEnd(change) {

    console.log(change.target.value);

    if (this.state.onSeekState) {
      this.audioService.seekTo(change.target.value);
      this.play();
    } else {
      this.audioService.seekTo(change.target.value);
    }
  }

  toggleShuffle() {

    this.state.shuffle = (!this.state.shuffle);
    console.log(`Shuffle: ${this.state.shuffle}`);

  }

  shuffle() {
    const index = Math.floor(Math.random() * (this.files.length - 1));
    const file = this.files[index];
    this.openFile(file, index);
  }

  toggleRepeat() {
    this.state.repeat = (!this.state.repeat);
    console.log(`Repeat: ${this.state.repeat}`);
  }

  repeat() {
    const index = this.currentFile.index;
    const file = this.files[index];
    this.openFile(file, index);
  }

  setPlaybackSpeed(speed) {
    this.audioService.playbackSpeed(speed);
  }

  setFormat(format: any) {

    if (format === 'mp3') {
      this.wavToggle = false;
      this.oggToggle = false;
      this.format = 'mp3';

      const index = this.currentFile.index;
      const file = this.files[index];

      this.openFile(file, index);

    }
    if (format === 'ogg') {
      this.wavToggle = false;
      this.oggToggle = true;
      this.format = 'ogg';
      this.bitRate = '256';

      const index = this.currentFile.index;
      const file = this.files[index];

      this.openFile(file, index);
    }
    if (format === 'wav') {
      this.wavToggle = true;
      this.oggToggle = true;
      this.format = 'wav';

      const index = this.currentFile.index;
      const file = this.files[index];

      this.openFile(file, index);
    }

  }

  setBitrate(bitrate: any) {

    if (bitrate === '128') {

      this.bitRate = '128';

      const index = this.currentFile.index;
      const file = this.files[index];

      this.openFile(file, index);

    }
    if (bitrate === '256') {

      this.bitRate = '256';

      const index = this.currentFile.index;
      const file = this.files[index];

      this.openFile(file, index);

    }
    if (bitrate === '320') {

      this.bitRate = '320';

      const index = this.currentFile.index;
      const file = this.files[index];

      this.openFile(file, index);

    }

  }

}
