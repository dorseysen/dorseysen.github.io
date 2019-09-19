class videoCapture {

    constructor (options) {

        this.Dom = options.Dom;

        this.input = this.Dom.querySelector('input');
        this.btn = this.Dom.querySelector('button');
        this.video = this.Dom.querySelector('video');
        this.image = this.Dom.querySelector('img');

        this.file = '';
        this.src = '';

        this.initEvent();
    }

    //  video文件上传
    upLoadFile () {

        let _self = this;

        _self.input.addEventListener('change', function (e) {

            _self.file = this.files[0];
            _self.src = window.URL.createObjectURL(_self.file);

            _self.video.src = _self.src;
        });

        _self.btn.addEventListener('click', function () {

            _self.input.click();
        });
    }
    //  创建画布
    createCanvas () {

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        this.canvas = canvas;
        this.ctx = ctx;
    }
    initEvent () {

        let _self = this;

        _self.upLoadFile();
        _self.createCanvas();
        
        _self.video.addEventListener('loadeddata', function () {

            _self.canvas.width = this.videoWidth;
            _self.canvas.height = this.videoHeight;
        });

        var nowTime = 0;

        _self.video.addEventListener('timeupdate', function (e) {

            _self.ctx.drawImage(this, 0, 0, this.videoWidth, this.videoHeight);

            let src = _self.canvas.toDataURL('image/jpeg');

            if(this.currentTime > nowTime){

                _self.appendImg(src);
                
                nowTime += 2;
            }
        })
    }
    appendImg (src) {

        var screenshotList = document.querySelector('.screenshotList');

        var oDiv = document.createElement('div'),
            img = document.createElement('img');
            img.src = src;

        oDiv.className = 'pd10 animated bounceInRight';
        oDiv.appendChild(img);

        screenshotList.insertBefore(oDiv, screenshotList.querySelector('div'));

        // screenshotList.appendChild(oDiv);
        // screenshotList.scrollTop = screenshotList.scrollHeight;
    }
}
export default videoCapture;