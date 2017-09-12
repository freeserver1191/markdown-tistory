/**
 * Created by jojoldu@gmail.com on 2017-01-07
 * Blog : http://jojoldu.tistory.com
 * Github : http://github.com/jojoldu
 */

const fs = require('fs-extra');
const path = require('path');
const requestPromise = require('request-promise');
const print = require('./print');

const LOCAL_IMAGE_REGEX = new RegExp("^(http|https)://", "i");
const MARKDOWN_IMAGE_REGEX = /!\[[^\]]+\]\([^)]+\)/g;
const TISTORY_API_URL = 'https://www.tistory.com/apis/post/attach';

const isNotLocalImage = function (image) {
    return LOCAL_IMAGE_REGEX.test(image);
};

function extractPath(markdownImage) {
    return markdownImage.split('(')[1].replace(')', '');
}

const exchange = function (markdownText, params) {
    const images = markdownText.match(MARKDOWN_IMAGE_REGEX) || [];

    return Promise.all(images
        .map((markdownImage) => {
            return new Promise((resolve) => {
                const imagePath = extractPath(markdownImage);

                if(isNotLocalImage(imagePath)){
                    resolve(false);
                }else{
                    fs.exists(imagePath)
                        .then((isExist)=>{
                            if(isExist){
                                const formData = {
                                    "access_token":params.accessToken,
                                    "blogName":params.blogName,
                                    "targetUrl":params.targetUrl,
                                    "uploadedfile": fs.createReadStream(imagePath),
                                    "output":"json"
                                };

                                requestPromise.post({url:TISTORY_API_URL, formData:formData})
                                    .then((response) => {
                                        const tistory = JSON.parse(response).tistory;

                                        if(tistory.status === '200'){
                                            resolve({localPath:imagePath, tistoryUrl:tistory.url});
                                        } else {
                                            print.red('code: '+tistory.status+' message: '+tistory['error_message']);
                                            resolve(false);
                                        }
                                    })
                                    .catch((err) => {
                                        throw err;
                                    });
                            } else {
                                resolve(false);
                            }
                        });
                }
            });
        }))
        .then((replaces) => {
            let markdownData = markdownText;
            for(let i=0,length=replaces.length;i<length;i++){
                if(markdownData){
                    markdownData = markdownData.replace(replaces[i].localPath, replaces[i].tistoryUrl);
                }
            }
            return new Promise((resolve) => {
                resolve(markdownData);
            });
        })
        .catch((err)=>{
            throw err;
        });
};



exports.exchange = exchange;