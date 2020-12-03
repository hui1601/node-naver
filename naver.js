const rp = require('request-promise');
const nodeRsa = require('node-rsa');
const lzString = require('lz-string');
const crypto = require('crypto');
const getLenChar = value => String.fromCharCode(`${value}`.length);
const uuid = require('uuid').v4();// UUID V4를 렌덤으로!
module.exports = {
    /**
     * @description 네이버 앱 내부 API의 URL 계산
     * @param {Int} time 유닉스 타임스템프 시간
     * @param {String} url 원본 URL
     * @param {String} key 암호화 키
     */
    getNaverAppsEncUrl: function (time, url, key) {
        url = url.substring(0, Math.min(255, url.length));
        return (url.includes('?') ? url + '&' : url + '?') + 'msgpad=' + time + '&md=' + encodeURIComponent(crypto.createHmac('sha1', key).update(url + time).digest('base64'));
    },
    /**
     * @see https://gist.github.com/GwonHyeok/641fb3ac40c87ff346500051df9b583a
     * @see https://cafe.naver.com/nameyee/27386
     * @author GwonHyeok, Hibot, Kiri
     * @param {String} email 로그인 id
     * @param {String} password 비밀번호
     */
    login: async function (email, password) {
        if (!email instanceof String) throw new ReferenceError('email must be String.');
        if (!password instanceof String) throw new ReferenceError('password must be String.');
        const cookieJar = rp.jar();
        // 세션 키 발급
        const keys = await rp({ url: 'https://nid.naver.com/login/ext/keys2.nhn', jar: cookieJar });

        // 키 분리
        const segmentalizedKeys = keys.split(',');

        // 키 분리 데이터
        const sessionkey = segmentalizedKeys[0];
        const keyname = segmentalizedKeys[1];
        const nvalue = segmentalizedKeys[2];
        const evalue = segmentalizedKeys[3];

        // RSA Public Key 설정
        const key = new nodeRsa();
        key.importKey({
            e: Buffer.from(evalue, 'hex'),
            n: Buffer.from(nvalue, 'hex')
        }, 'components-public');
        key.setOptions({ encryptionScheme: 'pkcs1' });

        // 아이디 비밀번호 암호화
        const encpw = key.encrypt(
            `${getLenChar(sessionkey)}${sessionkey}${getLenChar(email)}${email}${getLenChar(password)}${password}`,
            'hex'
        );
        const data = {
            a: uuid + '-4',
            b: '1.3.4',
            d: [
                {
                    i: 'id',
                    b: {
                        a: [
                            '0,' + email
                        ]
                    },
                    d: email,
                    e: false,
                    f: false
                },
                {
                    i: 'pw',
                    e: true,
                    f: false
                }
            ],
            h: '1f',
            i: {
                a: 'Mozilla/5.0'
            }
        };
        const encData = lzString.compressToEncodedURIComponent(JSON.stringify(data));
        const bvsd = {
            uuid: uuid,
            encData: encData
        };

        // 로그인 요청
        const loginResponse = await rp({
            method: 'POST',
            url: 'https://nid.naver.com/nidlogin.login',
            jar: cookieJar,
            formData: {
                encpw: encpw,
                enctp: 1,
                svctype: 1,
                smart_LEVEL: -1,
                bvsd: JSON.stringify(bvsd),
                encnm: keyname,
                locale: 'ko_KR',
                url: 'https://www.naver.com',
                nvlong: 'on' //로그인 유지
            },
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // 로그인 결과에서 로그인 승인 url 추출
        const extractLoginFinalizeUrl = /location.replace\("(.*)"\)/g.exec(loginResponse);
        const finalizeUrl = extractLoginFinalizeUrl ? extractLoginFinalizeUrl[1] : null;

        // url 추출에 실패했다면 로그인에 실패했다
        if (!finalizeUrl) throw new Error('로그인에 실패하였습니다');

        // 로그인 승인
        await rp({
            url: finalizeUrl,
            jar: cookieJar
        });
        // NNB쿠키 굽기(냠냠)
        // 일부 API가 필요로 함
        await rp({
            url: 'https://lcs.naver.com/m',
            jar: cookieJar
        });
        return cookieJar;
    },
    /**
     * @description 네이버 로그아웃
     * @param {jar} cookieJar 네이버에 로그인된 cookie jar
     */
    logout: async function (cookieJar) {
        if (!cookieJar instanceof Object) throw new ReferenceError('cookieJar must be Object.');
        await rp({
            url: 'https://nid.naver.com/nidlogin.logout?returl=https%3A%2F%2Fwww.naver.com',
            jar: cookieJar
        })
        return cookieJar;
    }
};