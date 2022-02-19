(function() {
    let fileList = [];
    let styleArr = ["line", "bar"];
    let style = localStorage.getItem("audio-style") || styleArr[0];
    let _index = 0;
    let pro = document.getElementById("progress");

    function $(el) {
        return document.querySelector(el);
    }
    // 改变样式
    $("#change").onclick = function() {
        if (_index < styleArr.length - 1) {
            _index++;
        } else {
            _index >= 0 ? _index-- : index++;
        }
        style = styleArr[_index];
        localStorage.setItem("audio-style", style);
    };

    let timer = $("#time");
    var audioCtx = null,
        audioSource = null,
        analyserNode = null,
        width = null,
        height = null,
        index = 0, // 播放指针
        len = 0, // 播放列表长度
        percent = 0; // 频谱水平平铺比例

    // 播放速度
    let el_rate = document.getElementById("rate")

    function initAudio() {
        if (audioCtx != null) {
            audioCtx.close();
        }
        audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        audioSource = audioCtx.createBufferSource();
        analyserNode = audioCtx.createAnalyser();


        // 过滤器
        let filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';

        console.log(audioSource)
            // 自动切换
            // audioSource.onended = () => {
            //   next();
            // };
    }


    el_rate.onchange = function() {
        audioSource.playbackRate.value = this.value
    }
    let time = null,
        rf = null,
        render = null,
        autoStop = true; // 判断是否是人为停止

    function dataDeal() {
        let showTime;
        clearInterval(showTime);
        let arr = new Uint8Array(analyserNode.frequencyBinCount);
        percent = width / arr.length;
        rf =
            window.requestAnimationFrame ||
            window.webkitrequestAnimationFrame ||
            window.mozrequestAnimationFrame; //兼容
        render = function() {
            analyserNode.getByteFrequencyData(arr);
            time = rf(render);
            canvas(arr);
        };
        rf(render);
        showTime = setInterval(() => {
            let t = timeFormat(audioCtx.currentTime);
            timer.innerText = t.h + ":" + t.m + ":" + t.s;
        }, 1000);
    }

    function timeFormat(tamp) {
        if (tamp != null) {
            return {
                h: parseInt(tamp / 60 / 60),
                m: parseInt(tamp / 60),
                s: parseInt(tamp % 60),
            };
        }
    }
    let next = function() {
        index < len - 1 ? index++ : (index = 0);
        readFile();
    };
    let prev = function() {
        index > 0 ? index-- : (index = len - 1);
        readFile();
    };
    // 下一曲
    $("#next").onclick = next;
    $("#prev").onclick = prev;

    // 播放暂停
    let pause = () => {
        if (audioCtx != null) {
            if (audioCtx.state === "running") {
                audioCtx.suspend().then(() => {
                    cancelAnimationFrame(time);
                    $("#play").innerText = "播放";
                });
            } else if (audioCtx.state === "suspended") {
                audioCtx.resume().then(() => {
                    rf(render);
                    $("#play").innerText = "暂停";
                });
            }
        }
    };

    $("#play").onclick = pause;
    let play = (e) => {
        audioSource.buffer = e;
        analyserNode.fftSize = 256;
        audioSource.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);
        dataDeal();
        audioSource.loop = false;
        // 循环播放，默认为false
        audioSource.start(2);
    };
    document.getElementById("stop").onclick = function() {
        audioSource.stop();
    }
    pro.oninput = function() {
        let value = this.value;
        audioSource.start(value);
    }

    function getFileName(path, prefix) {
        let i = path.lastIndexOf(".");
        return path.substr(0, i) + "." + prefix;
    }

    function readFile() {
        let file = fileList[index];
        $("#index").innerText = index + 1 + "/" + len;
        if (file !== undefined) {
            initAudio();
        }
        let txtName = getFileName(file.name, "dtr");
        axios
            .get(`http://127.0.0.1/${txtName}`, {
                responseType: "blob",
            })
            .then((data) => {
                console.log(data);
            })
            .catch((err) => {
                console.log("错误", err);
            });
        let fr = new FileReader();
        fr.onload = function(e) {
            $("#res").innerText =
                fileList[index].name +
                " 大小:" +
                (fileList[index].size / 1024 / 1024).toFixed(2) +
                " MB";
            audioCtx.decodeAudioData(
                e.target.result,
                (bf) => {
                    play(bf);
                },
                () => {
                    throw new Error("audio file is error");
                }
            );
        };
        fr.readAsArrayBuffer(file);
    }
    // 设置线条的宽度
    let c = document.querySelector("#can"),
        ctx = c.getContext("2d"),
        pEl = document.createElement("div");
    c.parentNode.replaceChild(pEl, c);
    pEl.appendChild(c);

    function setSize() {
        width = parseInt(window.getComputedStyle($("#app")).width);
        height = parseInt(window.getComputedStyle($("#app")).height);
        c.setAttribute("width", width);
        c.setAttribute("height", height);
    }
    setSize();
    // 颜色
    let cor = ["#ff0000", "#FF9900", "#55aaff"];
    let xf = ctx.createLinearGradient(0, 0, 200, 200);

    xf.addColorStop(0, cor[0]);
    xf.addColorStop(0.5, cor[1]);
    xf.addColorStop(1, cor[2]);
    ctx.lineWidth = 10;
    ctx.lineJoin = "round";
    ctx.strokeStyle = xf;
    document.ondragover = function(e) {
        e.preventDefault();
    };
    document.ondrop = function(e) {
        e.preventDefault();
    };
    c.addEventListener("dragenter", (e) => {
        pEl.classList.add("drag-hover");
        e.dataTransfer.dropEffect = "copy";
        c.addEventListener("drop", function(data) {
            let t = data.dataTransfer.files;
            for (var i = 0; i < t.length; i++) {
                fileList.push(t[i]);
            }
            pEl.classList.remove("drag-hover");
            len = fileList.length;
            readFile();
        });
        c.addEventListener("dragleave", function() {
            pEl.classList.remove("drag-hover");
        });
    });
    // 添加监听
    function canvas(arr) {
        ctx.clearRect(0, 0, width, height);
        ctx.beginPath();
        if (style === "line") {
            ctx.lineCap = "round";
            ctx.moveTo(0, height - arr[0]);
            for (let i = 1; i < arr.length; i++) {
                let ar = arr[i];
                ctx.lineTo(i * percent, height - ar);
            }
            ctx.stroke();
        } else if (style === "bar") {
            for (let i = 0; i < arr.length; i++) {
                ctx.beginPath();
                ctx.moveTo(i * (ctx.lineWidth + 2), height);
                ctx.lineTo(i * (ctx.lineWidth + 2), height - arr[i]);
                ctx.shadowColor = "black";
                ctx.shadowBlur = 2;
                ctx.stroke();
                ctx.fill();
            }
        }
    }
})();

/*
for(var i=1;i<=60;i++){ 
        if(i%5==0){ 
          context.save();//保存当前绘制环境 
          context.beginPath(); 
          context.lineWidth =clockDimensions/30; 
          context.strokeStyle = "#9AABB1"; 
          //重置坐标原点（0,0） 
          context.translate(canvas.width/2,canvas.height/2); 
          //绘制环境旋转方法,以（0,0）为参考点进行旋转 
          context.rotate(Math.PI*2/60 * i); 
          context.moveTo(0,clockDimensions-clockDimensions/30); 
          context.lineTo(0,clockDimensions-clockDimensions/8); 
          context.stroke(); 
          context.beginPath(); 
          context.textAlign = 'center'; 
          context.textBaseline = 'middle'; 
          context.font = 'bold '+Math.floor(clockDimensions/10)+'px 宋体'; 
          context.fillStyle = "#03671F"; 
          context.fillText(i/5,0,0-(clockDimensions-clockDimensions/5)); 
          context.fill(); 
          context.restore();//恢复当前保存的绘制环境 
        }else { 
          context.save(); 
          context.beginPath(); 
          context.lineWidth = Math.floor(clockDimensions/100); 
          context.strokeStyle = "#8EA5AB"; 
          //重置坐标原点（0,0） 
          context.translate(canvas.width / 2, canvas.height / 2); 
          //绘制环境旋转方法,以（0,0）为参考点进行旋转 
          context.rotate(Math.PI * 2 / 60 * i); 
          context.moveTo(0, clockDimensions-clockDimensions/20); 
          context.lineTo(0, clockDimensions-clockDimensions/10); 
          context.stroke(); 
          context.restore(); 
        } */