

document.addEventListener('DOMContentLoaded', () => {
  let mediaRecorder;
  let audioChunks = [];
  let isRecording = false;
  let audioContext;
  let microphoneStream;

  const startRecordButton = document.getElementById('startRecord');
  const stopRecordButton = document.getElementById('stopRecord');
  const saveRecordButton = document.getElementById('saveRecord');
  const audioPlayer = document.getElementById('audioPlayer');
  const audioUrlInput = document.getElementById('audioUrlInput');
  const canvas = document.getElementById('visualizer');
  const canvasCtx = canvas.getContext('2d');


  
 

  // 마이크 음향 캔슬링 설정 추가 및 AudioContext 초기화
  async function initializeMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false } });

    // 이미 생성된 audioContext가 없으면 새로 생성
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const source = audioContext.createMediaStreamSource(stream);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    mediaRecorder = new MediaRecorder(destination.stream);

    // 데이터가 사용 가능할 때 이벤트 핸들러 등록
    mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    });

    // 녹음이 끝났을 때 이벤트 핸들러 등록
    mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // 오디오 플레이어에 녹음된 오디오 설정
        audioPlayer.src = audioUrl;

        // 입력 필드에 녹음된 오디오의 URL 설정
        if (audioUrlInput) {
            audioUrlInput.value = audioUrl;
        }
    });
    microphoneStream = stream; // 수정된 부분: 마이크 스트림 변수에 할당

    return stream; // stream 반환
}

  // 녹음 시작 버튼 클릭 시 호출되는 함수
  startRecordButton.addEventListener('click', async () => {
      const stream = await initializeMicrophone();

      // 녹음 중인지 확인하는 플래그
      isRecording = true;

      // 녹음 버튼 상태 변경
      startRecordButton.disabled = true;
      stopRecordButton.disabled = false;
      saveRecordButton.disabled = true;

      // 녹음 시작
      mediaRecorder.start();

      // 시각화 함수 호출
      draw(canvas,stream);
  });

  // 녹음 중지 버튼 클릭 시 호출되는 함수
  stopRecordButton.addEventListener('click', () => {
      // 녹음 중지
      mediaRecorder.stop();

      // 녹음 버튼 상태 변경
      startRecordButton.disabled = false;
      stopRecordButton.disabled = true;
      saveRecordButton.disabled = false;

      // 녹음 중인지 확인하는 플래그 갱신
      isRecording = false;
  });

  // 저장 버튼 클릭 시 호출되는 함수
  saveRecordButton.addEventListener('click', () => {
      // 저장 버튼 클릭 시 녹음된 오디오를 서버에 업로드
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

          // 입력 필드에 저장된 오디오의 URL 설정
          if (audioUrlInput) {
              audioUrlInput.value = audioUrl;
          }

          // 사용자에게 알림 표시
          alert(`Recording saved! Share this URL: http://localhost:3000/play/${audioUrl}`);
      });
  });

  // 저장된 오디오 재생 버튼 클릭 시 호출되는 함수
  document.getElementById('playSavedAudio').addEventListener('click', () => {
      const audioId = prompt('Enter the audio ID:');
      if (audioId) {
          const trimmedAudioId = audioId.replace(/^\/uploads\//, '');

          // 저장된 오디오를 서버에서 가져와 재생
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

  // 시각화 함수
  function draw(canvas, stream) {
      if (!isRecording) {
          return;
      }

      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 2048;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      function drawWaves() {
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(0, 255, 0)';
        canvasCtx.beginPath();
    
        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;
    
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;
    
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
    
            x += sliceWidth;
        }
    
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
    
        requestAnimationFrame(drawWaves);
    }
    drawWaves();
  }

});



