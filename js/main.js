(function() {
    function $(el) {
        return document.querySelector(el);
    }
    let styleArr = ["line", "bar"];
    let style = localStorage.getItem("audio-style") || styleArr[0];
    let _index = 0;
    let pro = document.getElementById("progress");
    let ul = $(".play-list");
    let pt = null;
    // 响应式列表
    const playList = new Proxy([], {
        set(target, key, value) {
            return Reflect.set(target, key, value);
        },
        get(t, p) {
            pt = (playList);
            return t[p];
        }
    });

    function renderList() {
        let f = document.createDocumentFragment();
        for (let index = 0; index < pt.length; index++) {
            const el = pt[index];
            const li = document.createElement("li");
            li.innerText = el.name;
            f.appendChild(li);
        }
        ul.appendChild(f);
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
    let el_rate = document.getElementById("rate"),
        globalVol = null;

    function initAudio() {
        if (audioCtx != null) {
            audioCtx.close();
        }
        audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        audioSource = audioCtx.createBufferSource();
        analyserNode = audioCtx.createAnalyser();
        // 过滤器
        let filter = audioCtx.createBiquadFilter();
        // filter.type = 'lowpass';
        // 音量
        globalVol = audioCtx.createGain();
        // 自动切换
        // audioSource.onended = () => {
        //   next();
        // };
    }

    $("#volumn").onchange = function() {
        globalVol.gain.value = this.value / 100;
    }

    el_rate.onchange = function() {
        audioSource.playbackRate.value = this.value
    }

    pro.oninput = function() {
        let value = Number(this.value);
        audioCtx.audioWorklet.currentTime = value.toFixed(2);
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
            let t = timeFormat(audioSource.context.currentTime),
                a = timeFormat(audioSource.buffer.duration);
            timer.innerText = t.h + ":" + t.m + ":" + t.s + "/" + a.h + ":" + a.m + ":" + a.s;
        };
        rf(render);
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

    function pushToList(file) {
        let name = file.name,
            prefix = name.substr(name.lastIndexOf(".") + 1),
            attr = {
                name,
                prefix,
                file: file,
                size: file.size / 1024 / 1024
            }
        playList.push(attr);
    }
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
    // 播放
    $("#play").onclick = pause;
    let play = (e) => {
        audioSource.buffer = e;
        analyserNode.fftSize = 256;
        audioSource.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);
        dataDeal();
        audioSource.loop = false;
        audioSource.start(0); // 循环播放，默认为false

    };
    document.getElementById("stop").onclick = function() {
        audioSource.stop();
    }


    function getFileName(path, prefix) {
        let i = path.lastIndexOf(".");
        return path.substr(0, i) + "." + prefix;
    }

    function readFile() {
        let file = playList[index];
        $("#index").innerText = index + 1 + "/" + len;
        if (file !== undefined) {
            initAudio();
        }
        let txtName = getFileName(file.name, "dtr");
        let fr = new FileReader();
        fr.onload = function(e) {
            $("#res").innerText =
                file.name +
                " 大小:" +
                (file.size / 1024 / 1024).toFixed(2) +
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
        fr.readAsArrayBuffer(file.file);
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
    // 双击事件
    c.addEventListener("dblclick", () => {
        const evt = new MouseEvent("click", {
            bubbles: false,
            cancelable: true,
            view: window
        });
        $("input[type='file']").dispatchEvent(evt);
        $("input[type='file']").addEventListener("change", function() {
            let file = this.files;
            for (let i = 0; i < file.length; i++) {
                const element = file[i];
                pushToList(element)
            }
            readFile();
        })
    })

    // 拖拽事件
    c.addEventListener("dragenter", (e) => {
        pEl.classList.add("drag-hover");
        e.dataTransfer.dropEffect = "copy";
        c.addEventListener("drop", function(data) {
            let t = data.dataTransfer.files;
            for (var i = 0; i < t.length; i++) {
                pushToList(t[i]);
            }
            pEl.classList.remove("drag-hover");
            len = playList.length;
            readFile();
        });
        c.addEventListener("dragleave", function() {
            pEl.classList.remove("drag-hover");
        });
    });
    // 图形
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