const rp = require('request-promise');
const xml2json = require('xml2json');
const naver = require('./naver');
const WebSocket = require('socket.io-client');
const CAFE_APP_KEY = 'Vj4jD4n5lUf9g2I0y7QyilPDPiiusHJb5kTdZDV7b2UUARhPFXPxPdRXtgK3Ej8k';
module.exports = {
    talkType: {
        'ONETOONE': 1,//1:1
        'GROUP': 2,//그룹
        'OPEN': 4,//오픈
        'TRADE': 7//거래
    },
    talkMemberLevel: {
        'MEMBER': 1,//일반 멤버
        'STAFF': 888,//스탭
        'MANAGER': 999,//매니저
    },
    /**
     * @description 카페의 uri에서 카페 id를 가지고옵니다
     * @example
     * let cafeId = getCafeId('cafesupport')//'https://cafe.naver.com/cafesupport'
     * console.log(cafeId) //'12048475'
     * @returns 카페 id
     * @param {String} cafeurl 예시 참고
     */
    getCafeId: async function (cafeurl) {
        return JSON.parse(
            xml2json.toJson(await rp({
                url: naver.getNaverAppsEncUrl(new Date().getTime()
                    , `https://apis.naver.com/cafemobileapps/cafe/CafeInfo.xml?cluburl=${cafeurl}&checkPopularArticle=false&checkPopularMember=false`
                    , CAFE_APP_KEY)
            }))
        ).message.result.club.clubid;
    },
    /**
     * @description 지정된 게시판 번호에서 글 목록을 가져옵니다. 게시판 번호가 지정되어있지 않으면 전체 글 목록을 가져옵니다.
     * @param {String} cafeId 숫자로 이루어진 카페 id
     * @param {String} menuId 게시판 번호
     */
    getArticleList: async function (cafeId, menuId = '') {
        return JSON.parse(await rp({ url: `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${cafeId}&search.perPage=5&search.menuid=${menuId}&search.queryType=lastArticle&moreManageMenus=false` }));
    },
    attendancePost: async function(cookie, cafeId, menu, content){
        let iconv = new require('iconv').Iconv('utf-8', 'CP949');
        
        console.log(await rp({
            url: 'https://cafe.naver.com/AttendancePost.nhn',
            method: 'post',
            headers: {
                'referer': 'https://cafe.naver.com/AttendanceView.nhn?search.clubid=29537083&search.menuid=95&search.attendyear=2020&search.attendmonth=12&search.attendday=10&search.page=1&lcs=Y',
                'origin': 'https://cafe.naver.com',
                'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
                'sec-fetch-dest': 'iframe',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-user': '?1',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `attendancePost.cafeId=${cafeId}&attendancePost.menuId=${menu}&attendancePost.page=1&attendancePost.emotion=11&attendancePost.content=${escape(iconv.convert(content).toString('binary'))}`,
            jar: cookie
        }))
    },
    /**
     * @description SE One에디터의 노드 UUID를 렌덤으로 생성합니다.
     */
    getSEEditorNodeId: function(){
        return "SE-"+require('uuid').v4();
    },
    writeArticle: async function (cookie, cafeId, title, content, menu, tags = [], open = false, naverOpen = true, externalOpen = true, enableComment = true, enableScrap = true, enableCopy = true, useAutoSource = false, cclTypes = [], useCcl = false){
        let Obj = {};
        Obj.article = {};
        Obj.article.cafeId = cafeId;
        Obj.article.contentJson = JSON.stringify(content);
        Obj.article.from = "pc";
        Obj.article.menuId = menu;
        Obj.article.subject = title;
        Obj.article.tagList = tags;
        Obj.article.editorVersion = 4;
        Obj.article.parentId = 0;
        Obj.article.open = open;
        Obj.article.naverOpen = naverOpen;
        Obj.article.externalOpen = externalOpen;
        Obj.article.enableComment = enableComment;
        Obj.article.enableScrap = enableScrap;
        Obj.article.enableCopy = enableCopy;
        Obj.article.useAutoSource = useAutoSource;
        Obj.article.cclTypes = cclTypes;
        Obj.article.useCcl = useCcl;
        return await rp({
            url: `https://apis.naver.com/cafe-web/cafe-editor-api/v1.0/cafes/${cafeId}/menus/${menu}/articles`,
            method: 'POST',
            json: Obj,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:83.0) Gecko/20100101 Firefox/83.0',
                'Referer': `https://cafe.naver.com/ca-fe/cafes/${cafeId}/articles/write?boardType=L`,
                'Origin': 'https://cafe.naver.com',
                'X-Cafe-Product': 'pc'
            },
            jar: cookie
        });
    },
    /**
     * @description 카페 글에 댓글을 답니다.
     * @param {jar} cookie 네이버에 로그인된 쿠키 jar
     * @param {Object} content 예시참고
     * @example
cafe.comment(cookie, {
    // 댓글 내용
    'content': '이 댓글은 자동으로 작성되었습니다.',
    // 스티커
    'stickerId': '', // 스티커 없음
    // 'stickerId': 'ogq_598f0ee5ed61b-1-185-160', // 스티커 url: https://storep-phinf.pstatic.net/ogq_598f0ee5ed61b/original_1.png?type=p100_100
    // 사진
    'imagePath': photo.item.path + '/',//사진 경로
    'imageFileName': photo.item.fileName, //사진 이름
    'imageWidth': photo.item.width, //사진 가로 길이
    'imageHeight': photo.item.height, //사진 세로 길이
    // 카페, 글 아이디
    'cafeId': CAFE_ID,
    'articleId': res.articleId,
    'requestFrom': 'A'
});
     */
    comment: async function (cookie, content) {
        await rp({
            url: 'https://apis.naver.com/cafe-home-web/cafe-home/v1/member/identifier',
            jar: cookie,
            headers: {
                'X-Cafe-Product': 'pc',
                'Referer': `https://cafe.naver.com/ca-fe/cafes/${content.cafeId}/articles/${content.articleId}`,
                'Origin': 'https://cafe.naver.com'
            }
        });
        return JSON.parse(await rp({
            method: 'post',
            url: 'https://apis.naver.com/cafe-web/cafe-mobile/CommentPost.json',
            formData: content,
            jar: cookie,
            headers: {
                'X-Cafe-Product': 'pc',
                'Referer': `https://cafe.naver.com/ca-fe/cafes/${content.cafeId}/articles/${content.articleId}`,
                'Origin': 'https://cafe.naver.com'
            }
        }));
    },
    /**
     * @description 사진업로드에 쓰이는 키를 가지고 옵니다. 
     * @param {jar} cookie 네이버에 로그인 된 cookie jar
     */
    getPhotoSessionKey: async function (cookie) {
        return JSON.parse(await rp({
            method: 'post',
            url: 'https://apis.naver.com/cafe-web/cafe-mobile/PhotoInfraSessionKey.json',
            jar: cookie
        }));
    },
    /**
     * @description 카페톡의 캡챠를 불러옵니다.
     * @returns 캡챠의 URL, 키가 들어있는 Object
     * @param {jar} cookie 네이버에 로그인 된 cookie jar
     */
    getTalkCaptcha: async function (cookie) {
        return JSON.parse(await rp({
            method: 'get',
            url: 'https://talk.cafe.naver.com/talkapi/v1/captcha',
            headers: {
                'referer': 'https://talk.cafe.naver.com/channels'
            },
            jar: cookie
        }));
    },
    /**
     * @description 사진을 업로드합니다.
     * @param {jar} cookie 네이버에 로그인 된 cookie jar
     * @param {String} file 파일경로
     */
    uploadPhoto: async function (cookie, file) {
        let sessionKey = (await getPhotoSessionKey(cookie)).message.result;
        return JSON.parse(
            xml2json.toJson(
                await rp({
                    method: 'post',
                    url: `https://cafe.upphoto.naver.com/${sessionKey}/simpleUpload/0`,
                    formData: {
                        'image': fs.createReadStream(file)
                    },
                    jar: cookie
                })
            )
        );
    },
    /**
     * 
     * @param {jar} cookie 네이버에 로그인된 cookie jar
     * @param {String} cafeId 카페 id
     * @param {String} name 방 이름
     * @param {String} desciption 방 설명
     * @param {String} profileImageUrl 방 프로필 사진
     * @param {String} captchaKey 캡챠 키
     * @param {String} captchaValue 캡챠 결과
     * @param {String} joinLevel 참가가능 등급
     */
    makeOpenChannel: async function (cookie, cafeId, name, desciption, profileImageUrl, captchaKey, captchaValue, joinLevel) {
        return JSON.parse(await rp({
            method: 'post',
            url: `https://talk.cafe.naver.com/talkapi/v3/categories/${cafeId}/openchannels`,
            form: {
                'name': name,
                'desciption': desciption,
                'profileImageUrl': profileImageUrl,
                'captchaKey': captchaKey,
                'captchaValue': captchaValue,
                'joinLevel': joinLevel
            },
            headers: {
                'referer': 'https://talk.cafe.naver.com/channels'
            },
            jar: cookie
        }));
    },
    getTalkList: async function (cookie) {
        return JSON.parse(await rp({
            method: 'get',
            url: 'https://talk.cafe.naver.com/talkapi/v3/channels',
            headers: {
                'referer': 'https://talk.cafe.naver.com/channels'
            },
            jar: cookie
        }));
    },
    // connectTalk: async function (cookie, chatId, userId, callback) { //아몰랑 때려쳐!
    //     let token = await (function() {
    //         return new Promise((resolve, reject) => {
    //             cookie._jar.store.getAllCookies(function (err, cookieArray) {
    //                 let returnValue = '';
    //                 cookieArray.forEach(function(e){
    //                     if (e.key == 'NID_AUT' || e.key == 'NID_SES'){
    //                         returnValue += `${e.key}=${e.value}; `;
    //                     }
    //                 });
    //                 resolve(returnValue);
    //             });
    //         });
    //     })();
    //     token = token.substring(0, token.length - 1);
    //     let miid = Math.floor(1e5 * Math.random()), oid = Math.floor(1e5 * Math.random());
    //     let sid = await rp({//sid 요청
    //         url: `https://talkwss.cafe.naver.com/socket.io/?channelNo=${chatId}&userId=${encodeURIComponent(userId)}&miid=42959&oid=92345&ccc=1&cc=1&rcc=0&rc=0&gc=0&accessToken=${encodeURIComponent(token)}&EIO=3&transport=polling`,
    //         headers: {
    //             'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36',
    //             'origin': 'https://talk.cafe.naver.com'
    //         },
    //         jar: cookie
    //     });
    //     sid = JSON.parse(sid.substring(sid.indexOf('{'))).sid;///sid 구하기, 앞에 이상한 문자(?)가 붙어나옴
    //     let requestP = `?channelNo=${chatId}&userId=${encodeURIComponent(userId)}&miid=${miid}&oid=${oid}&ccc=1&cc=1&rcc=0&rc=0&gc=0&accessToken=${encodeURIComponent(token)}&EIO=3&transport=polling&sid=${encodeURIComponent(sid)}&t=NOgO_aE`
    //     console.log(await rp({//sid 요청
    //         method: 'post',
    //         url: `https://talkwss.cafe.naver.com/socket.io/${requestP}`,
    //         headers: {
    //             'origin': 'https://talk.cafe.naver.com',
    //             'Referer': `https://talk.cafe.naver.com/channels/${chatId}`
    //         },
    //         body: `801:40/chat${requestP}`,
    //         jar: cookie
    //     }));
    //     let mode = 0;
    //     let messageSerialNumber = 10;// ack 수, 10부터 시작
    //     let ws = new WebSocket(`wss://talkwss.cafe.naver.com/socket.io/?accessToken=${encodeURIComponent(token)}&channelNo=${chatId}&userId=${encodeURIComponent(userId)}&miid=70542&oid=${Math.floor(1e5 * Math.random())}&ccc=1&cc=1&rcc=0&rc=0&gc=0&EIO=3&transport=websocket&sid=${encodeURIComponent(sid)}`, {
    //         method: 'get',
    //         headers: {
    //             'origin': 'https://talk.cafe.naver.com',
    //             'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.66 Safari/537.36',
    //             'Upgrade': 'websocket'
    //         }
    //     });
    //     ws.on('open', async function (event) {
    //         await ws.send('2probe');
    //     })
    //     ws.on('message', async function(msg){
    //         console.log(msg);
    //         let arr;
    //         switch(mode){
    //             case 0:
    //                 console.log('send 5...');
    //                 await ws.send(5);
    //                 arr = ['message_list_recent', { 'sessionKey': token }];
    //                 console.log('send ' + `42/chat,0${JSON.stringify(arr)}` + '...');
    //                 await ws.send(`42/chat,0${JSON.stringify(arr)}`);
    //             break;
    //             case 1:
    //                 arr = ['ack', { 'messageSerialNumber': ++messageSerialNumber, 'sessionKey': token }, null];
    //                 console.log('send ' + `42/chat,0${JSON.stringify(arr)}` + '...');
    //                 await ws.send(`42/chat,${JSON.stringify(arr)}`);
    //                 break;
    //         }
    //         mode++;
    //     });
    // },
    /**
     * 
     * @param {jar} cookie 네이버에 로그인된 cookie jar
     * @param {String} cafeId 카페 id
     * @param {Boolean} personalInfoCollectAgree  개인정보 수집
     * @param {String} cafeProfileImageUrl 프로필 사진 URL
     * @param {String} nickname 닉네임
     * @param {String} profileImageType 프로필 사진 타입
     * @param {Boolean} showSexAndAge 성별·연령대 공개
     * @param {Boolean} showBlog 블로그 공개
     */
    updateUserInfo: async function (cookie, cafeId, personalInfoCollectAgree = false, cafeProfileImageUrl = '', nickname = '', profileImageType = '1', showSexAndAge = false, showBlog = false) {
        return await rp({
            method: 'post',
            url: 'https://cafe.naver.com/CafeMemberInfoUpdate.nhn',
            form: {
                'clubid': cafeId,
                'personalInfoCollectAgree': personalInfoCollectAgree,
                'cafeProfileImageUrl': cafeProfileImageUrl,
                'nickname': nickname,
                'profileImageType': profileImageType,
                'showSexAndAge': showSexAndAge,
                'showBlog': showBlog
            },
            headers: {
                'referer': `https://cafe.naver.com/CafeMemberInfo.nhn`
            },
            encoding: null,
            jar: cookie
        });
    }
}