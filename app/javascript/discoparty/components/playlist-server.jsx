import React, { Component } from 'react';
import ReactPlayer from 'react-player';
import axios from 'axios';
import Track from './track';
import YoutubeAutocomplete from './youtube-autocomplete';
import FlipMove from 'react-flip-move';
import smartState from '../utils/state';

class PlaylistServer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      playlist: { tracks: [] },
      url: '',
      playing: false
    };
  }

  componentDidMount = () => {
    this.getInitialState();

    window.onbeforeunload = function() {
       return "Leaving this page will stop the music";
    };

    App.track = App.cable.subscriptions.create({
      channel: "PlaylistChannel",
      id: this.props.id
    }, {
      received: (response) => {
        let state = smartState(this.state, response);
        if (this.state.url == '' && state.playlist.tracks.length > 0) {
          state['url'] = state.playlist.tracks[0].url;
          state.playlist.tracks[0].playing = true;
        }
        this.newState(state);
      }
    });
  }

  newState = (state) => {
    this.setState(state);
    axios.post(`/api/v1/playlists/${this.props.id}/state`, { state: this.state });
  }

  updatePlaylist = (playlist) => {
    playlist.tracks = playlist.tracks.filter((track) => {
      return !this.state.playedTracks.includes(track.id);
    });
    this.setState({ playlist });
  }

  getInitialState = () => {
    axios.get(`/api/v1/playlists/${this.props.id}`)
      .then(response => {
        let state = smartState(this.state, response.data);
        if (state.playlist.tracks.length > 0) {
          state['url'] = state.playlist.tracks[0].url;
          state.playlist.tracks[0].playing = true;
        }
        this.newState(state);
      });
  }

  togglePlay = () => {
    let state = this.state;
    state.playing = !state.playing;
    this.newState(state);
  }

  endCallback = () => {
    let state = this.state;
    let currentTrack = this.currentTrack();
    currentTrack.played = true;
    currentTrack.playing = false;

    let nextTrack = this.nextTrack();
    if (nextTrack) {
      state.url = nextTrack.url;
      nextTrack.playing = true;
    } else {
      state.playing = false;
    }

    this.newState(state);
  }

  errorCallback = () => {
    this.endCallback();
  }

  currentTrack = () => {
    return this.state.playlist.tracks.find(track => track.playing);
  }

  nextTrack = () => {
    return this.state.playlist.tracks.find(track => !track.played);
  }

  isPlaying = (track) => {
    let current_track = this.state.playlist.tracks[0];
    return track == current_track && this.state.playing;
  }

  upvoted = (track) => {
    return track.upvoted.includes(parseInt(this.props.userId));
  }

  action = () => {
    return this.state.playing ? 'Pause' : 'Play';
  }

  tracks = () => {
    return this.state.playlist.tracks.filter((track) => {
      return !track.played;
    });
  }

  jumpToTrack = (track) => {
    let state = this.state;

    this.state.playlist.tracks.some((playlistTrack) => {
      if (playlistTrack.id != track.id) {
        playlistTrack.played = true;
        playlistTrack.playing = false;
        return false;
      } else {
        playlistTrack.playing = true;
        state.url = track.url;
        return true;
      }
    });

    this.newState(state);
  }

  render() {
    const playlistTracksClasses = this.state.playing ? 'playlist-tracks playing' : 'playlist-tracks';
    return (
      <div>
        <h1>{this.state.playlist.name}</h1>
        <p className="sharable-link">
          Let people interact with your playlist, share the link<br/>
          {this.props.shareableUrl}
        </p>


        <YoutubeAutocomplete playlistId={this.props.id} />

        <div className={playlistTracksClasses}>
          <header>
            <h3>Tracklist</h3>
            <button className="small" onClick={this.togglePlay}>{this.action()}</button>
          </header>
          <FlipMove
            duration={300}

            easing={'cubic-bezier(0.25, 0.5, 0.75, 1)'}
            staggerDurationBy={30}
            staggerDelayBy={10}
          >
            {this.tracks().map((track) => {
              return (
                <Track
                  playing={this.state.playing && track.playing}
                  active={track.playing}
                  upvoted={this.upvoted(track)}
                  track={track}
                  key={track.id}
                  client={false}
                  jumpCallback={this.jumpToTrack}
                />
              );
            })}
          </FlipMove>
        </div>

        <div id="embed-player-wrapper">
          <ReactPlayer
            url={this.state.url}
            playing={this.state.playing}
            onEnded={this.endCallback}
            onError={this.errorCallback}
            width={1}
            height={1}
          />
        </div>
      </div>
    );
  }
}

export default PlaylistServer;
