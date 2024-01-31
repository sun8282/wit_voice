document.addEventListener('DOMContentLoaded', () => {
    let mediaRecorder;
    let audioChunks = [];
  
    const startRecordButton = document.getElementById('startRecord');
    const stopRecordButton = document.getElementById('stopRecord');
    const saveRecordButton = document.getElementById('saveRecord');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioUrlInput = document.getElementById('audioUrlInput');
  
    startRecordButton.addEventListener('click', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
  
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });
  
      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
  
        if (audioUrlInput) {
          audioUrlInput.value = audioUrl;
        }
      });
  
      mediaRecorder.start();
      startRecordButton.disabled = true;
      stopRecordButton.disabled = false;
      saveRecordButton.disabled = true;
    });
  
    stopRecordButton.addEventListener('click', () => {
      mediaRecorder.stop();
      startRecordButton.disabled = false;
      stopRecordButton.disabled = true;
      saveRecordButton.disabled = false;
    });
  
    saveRecordButton.addEventListener('click', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioBlob);
  
      fetch('/upload', {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        const audioUrl = data.audioUrl;
        
        if (audioUrlInput) {
          audioUrlInput.value = audioUrl;
        }
        console.log(audioUrl)
        alert(`Recording saved! Share this URL: http://localhost:3000/play${audioUrl}`);
      });
    });
  
    document.getElementById('playSavedAudio').addEventListener('click', () => {
      const audioId = prompt('Enter the audio ID:');
      if (audioId) {
        const trimmedAudioId = audioId.replace(/^\/uploads\//, '');
        console.log(trimmedAudioId)
        fetch(`/play/${trimmedAudioId}`)
          .then(response => {
            if (response.ok) {
              return response.blob();
            } else {
              throw new Error('Network response was not ok');
            }
          })
          .then(blob => {
            const savedAudioUrl = URL.createObjectURL(blob);
            const audio = new Audio(savedAudioUrl);
            audio.play();
          })
          .catch(error => {
            console.error(error);
            alert('Error fetching audio.');
          });
      }
    });
  });
  