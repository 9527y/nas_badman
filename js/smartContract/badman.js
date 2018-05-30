"use strict";

var ManInfo = function (text) {
    if (text) {
        var obj = JSON.parse(text);
        this.name = obj.name;
        this.birthday = obj.birthday;
        this.phone = obj.phone;
        this.poll = obj.poll;
        this.author = obj.author;
    } else {
        this.name = "";
        this.birthday = "";
        this.phone = "";
        this.poll = 0
    }
};

ManInfo.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};


var BadMan = function () {
    //默认库
    LocalContractStorage.defineMapProperty(this, "repo");
    //手机号-投票数对应
    LocalContractStorage.defineMapProperty(this, "phonePollMap");
    //投票id，手机号
    LocalContractStorage.defineMapProperty(this, "idPollMap");
    //总人数
    LocalContractStorage.defineProperty(this, "size");
    //总投票数
    LocalContractStorage.defineProperty(this, "voteAmount");
    //被投的人数
    LocalContractStorage.defineProperty(this, "voteUserNum");

    LocalContractStorage.defineProperty(this, "admin");
};

BadMan.prototype = {

    init: function (admin) {
        this.size = 0;
        this.voteAmount = 0;
        this.voteUserNum = 0;
        this.admin = admin;
    },

    // 提现方法
    takeout: function (to, amount) {
        if (Blockchain.transaction.from != this.admin) {
            throw new Error("Permission denied.");
        }
        var result = Blockchain.transfer(to, amount * 1000000000000000000);
        if (!result) {
            throw new Error("Takeout failed. Address:" + to + ", NAS:" + amount);
        }
        return true;
    },


    save: function (name, birthday, phone) {
        name = name.trim();
        birthday = birthday.trim();
        phone = phone.trim();

        if (name === "" || birthday === "" || phone === "") {
            throw new Error("empty name / birthday / phone");
        }
        if (phone.length > 64 || birthday.length > 64 || name.length > 64) {
            throw new Error(" phone / name / birthday exceed limit length");
        }

        var from = Blockchain.transaction.from;
        var man = this.repo.get(phone);
        if (man) {
            throw new Error("phone has been occupied");
        }
        man = new ManInfo();
        man.author = from;
        man.name = name;
        man.phone = phone;
        man.birthday = birthday;
        man.poll = 0;
        this.repo.put(phone, man);
        this.size += 1;
        this.voteAmount += 1;
    },

    getLen: function () {
        return this.size;
    },
    voteHim: function (phone) {
        var thisMan = this.repo.get(phone);
        console.log(thisMan)
        thisMan.poll += 1;
        this.repo.set(phone, thisMan)
        this.voteAmount += 1;
        var poll = this.phonePollMap.get(phone)
        if (parseInt(poll)) {
            Event.Trigger("phonePollMap", {
                addTo: phone,
                from: Blockchain.transaction.from
            });
            poll += 1;
            this.phonePollMap.put(phone, poll);
        }
        else {
            Event.Trigger("phonePollMap", {
                newTo: phone,
                from: Blockchain.transaction.from
            });
            this.idPollMap.put(this.voteUserNum, phone);
            this.phonePollMap.put(phone, 1);
            this.voteUserNum += 1;
        }
        Event.Trigger("voteHim", {
            voteTo: phone,
            from: Blockchain.transaction.from
        })
    },
    getVoteAmount: function () {
        return this.voteAmount;
    },
    get: function (phone) {
        phone = phone.trim();
        console.log("method- get phone:" + phone)
        if (phone === "") {
            throw new Error("empty phone")
        }
        return this.repo.get(phone);
    },
    getMax: function () {
        var phones = [];
        var num = 10;
        if (this.voteUserNum < num) {
            num = this.voteUserNum;
        }
        for (var top = 0; top < num; top++) {
            var tmpPhone = '';
            var tmpPoll = 0;
            for (var i = 0; i < this.voteUserNum; i++) {
                var phone = this.idPollMap.get(i);
                var pPoll = this.phonePollMap.get(phone);
                var hasIn = false;
                for (var tp = 0; tp < phones.length; tp++) {
                    if (phones[tp].phone == phone) {
                        hasIn = true;
                    }
                }
                if (!hasIn) {
                    if (tmpPoll <= pPoll) {
                        tmpPoll = pPoll;
                        tmpPhone = phone;
                    }
                }
            }
            phones.push({phone: tmpPhone, poll: tmpPoll});
        }
        return phones;
    },
    getVoteUserNum: function () {
        return this.voteUserNum;
    },

    getPhonePollMap: function () {
        return this.phonePollMap;
    },
    getIdPollMap: function () {
        return this.idPollMap;
    },
    getRepo: function () {
        return this.repo;
    }
};
module.exports = BadMan;