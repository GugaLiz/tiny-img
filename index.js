const Fs = require("fs");
const Https = require("https");
const Path = require("path");
const Url = require("url");
const Chalk = require("chalk");
const Figures = require("figures");
const Ora = require("ora");
const {ByteSize, RandomNum, RoundNum} = require("trample/node");

//需要压缩的文件的地址
const filePath = "D:\\work\\miniprogram\\2021\\jx3\\jx3.xoyo.com_p_m_2021_10_25_collect-maps\\public\\assets\\images";

const TINYIMG_URL = [
  "tinyjpg.com",
  "tinypng.com"
];

function RandomHeader() {
  const ip = new Array(4).fill(0).map(() => parseInt(Math.random() * 255)).join(".");
  const index = RandomNum(0, 1);
  return {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
      "Postman-Token": Date.now(),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
      "X-Forwarded-For": ip
    },
    hostname: TINYIMG_URL[index],
    method: "POST",
    path: "/web/shrink",
    rejectUnauthorized: false
  };
}

function UploadImg(file) {
  const opts = RandomHeader();
  return new Promise((resolve, reject) => {
    const req = Https.request(opts, res => res.on("data", data => {
      const obj = JSON.parse(data.toString());
      obj.error ? reject(obj.message) : resolve(obj);
    }));
    req.write(file, "binary");
    req.on("error", e => reject(e));
    req.end();
  });
}

function DownloadImg(url) {
  const opts = new Url.URL(url);
  return new Promise((resolve, reject) => {
    const req = Https.request(opts, res => {
      let file = "";
      res.setEncoding("binary");
      res.on("data", chunk => file += chunk);
      res.on("end", () => resolve(file));
    });
    req.on("error", e => reject(e));
    req.end();
  });
}

async function CompressImg(dir, path) {
  try {
    const file = Fs.readFileSync(path, "binary");
    const obj = await UploadImg(file);
    const data = await DownloadImg(obj.output.url);
    const oldSize = Chalk.redBright(ByteSize(obj.input.size));
    const newSize = Chalk.greenBright(ByteSize(obj.output.size));
    const ratio = Chalk.blueBright(RoundNum(1 - obj.output.ratio, 2, true));
    const dpath = Path.join(dir, Path.basename(path));
    const msg = `${Figures.tick} Compressed [${Chalk.yellowBright(path)}] completed: Old Size ${oldSize}, New Size ${newSize}, Optimization Ratio ${ratio}`;
    Fs.writeFileSync(dpath, data, "binary");
    return Promise.resolve(msg);
  } catch (err) {
    const msg = `${Figures.cross} Compressed [${Chalk.yellowBright(path)}] failed: ${Chalk.redBright(err)}`;
    return Promise.resolve(msg);
  }
}

/**
 * 循环读取文件/文件夹
 * @param filePath
 */
function fileDisplay(filePath) {
  Fs.readdir(filePath, function (err, files) {
    if (err) {
      console.log('read dir error:', err);
    } else {
      files.forEach(function (file) {

        const filedir = Path.join(filePath, file);
        Fs.stat(filedir, async function (err, stats) {
          if (err) {
            console.warn('获取文件stats失败');
          } else {
            const isFile = stats.isFile();//是文件
            const isDir = stats.isDirectory();//是文件夹
            if (isFile) {
              /**
               *是文件就进行压缩
               * @type {Promise<*>|Promise<*>}
               */
              const res = await CompressImg(filePath, filedir);
              console.log(res);
            }
            if (isDir) {
              fileDisplay(filedir);
            }
          }
        })
      })
    }
  });
}

(() => {
  const spinner = Ora("Image is compressing......").start();
  fileDisplay(filePath);
  spinner.stop();

})();
