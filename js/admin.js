Admin = {
  web3Provider: null,
  contracts: {},

  init: async function() {
    
    $(function(){
      $("#awardTab a").click(function(e){
          e.preventDefault();
          $(this).tab("show");
      });

      $("#newAwardForm").bootstrapValidator();
    })
    return await Admin.initWeb3();
  },

  initWeb3: async function() {
    // Modern dapp browsers...
    if (window.ethereum) {
      Admin.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.enable();
      } catch (error) {
        // User denied account access...
        console.error("User denied account access")
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      Admin.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      Admin.web3Provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/36eb857d75414a69821e77480993c291');
    }
    web3 = new Web3(Admin.web3Provider);

    return Admin.initContract();
  },

  initContract: function() {
    $.getJSON('EONMemorial.json', function(data) {
      var EONMemorialArtifact = data;
      Admin.contracts.EONMemorial = TruffleContract(EONMemorialArtifact);
      Admin.contracts.EONMemorial.setProvider(Admin.web3Provider);
    
      return Admin.loadReward();
    });

    return Admin.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-award', Admin.handleAward);
    $(document).on('click', '.btn-add-admin', Admin.handleAddAdmin);
    $(document).on('click', '.btn-del-admin', Admin.handleRemoveAdmin);
    $(document).on('click', '.btn-load-name', Admin.LoadNameList);
    $(document).on('click', '.btn-deploy-all', Admin.DeployAll);

    //$(document).on('blur', '.c_name', App.handleUserName);
    $('#c_name').blur(Admin.handleUserName);
  },
  handleUserName: function() {
    $('#e_name').val(pinyin.getFullChars(this.value));
    $('#key').val(pinyin.getFullChars(this.value));
  },
  LoadNameList: function(){
    var namelist = $('#name-list').val();


    lines = namelist.split(/\n/g);
    json = {};

    for(j=0;j<lines.length;j++) {

        line = lines[j];
        if(line.length==0) continue;
        arr = line.split(/[.，]/g);
        obj = {};
        
        obj.name= arr[1];
        key = pinyin.getFullChars(arr[1]).toLowerCase();
        for(i=0;i<arr.length;i++){
            if(arr[i].indexOf('殉职')>0 ||arr[i].indexOf('去世')>0){
                arr[i] = arr[i].replace('殉职','');
                arr[i] = arr[i].replace('去世','');
                if(arr[i].indexOf('年')<0) arr[i] = "2020年" + arr[i];
                arr[i] = arr[i].replace('年','-').replace('月','-').replace('日','');
                obj.dieddate=arr[i];
                obj.avatar="profile/nopic.jpg";
                break;
            }
        }
        arr2 = line.split(/[.]/g);

        obj.detail = arr2[1]

        json[key]=obj;
    }

    $('#name-list2').val(JSON.stringify(json));
  },
  DeployAll:function(){
    nameList = JSON.parse($('#name-list2').val());
    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];

      let promises = [];

      const results = Object.keys(nameList).map(async key => { 
        var c_name = nameList[key]['name'];//$("#c_name").val();
          var e_name = key;
          var key = key;
          var type = 1;
          var bornDate = Admin.stringToTimestamp("");
          var diedDate = Admin.stringToTimestamp(nameList[key]['dieddate']);
      
          var id = Admin.generateKey(key);
      
          var eonMemorialInstance;
          Admin.contracts.EONMemorial.deployed().then(function(instance) {
            eonMemorialInstance = instance;
          }).then(function(result) {
            return eonMemorialInstance.rewardMemorial(account,id,c_name,e_name,key,type,bornDate,diedDate,{from:account});
          }).then(function(result) {
            return Admin.loadReward();
          }).catch(function(err) {
            console.log(err.message);
          })
        return key; });
      Promise.all(results).then((key)=>{
        //console.log("key is ",key); 
      });
      
      });

  },
  loadReward: function() {
    var namelist = {};
    $.getJSON('profile/list.json', function(data) {
      namelist = data;
    });
    Admin.contracts.EONMemorial.deployed().then(function(instance) {
      eonMemorialInstance = instance;
      
    }).then(function(result) {
      return eonMemorialInstance.getMemorialList();      
    }).then(function(result) {

      Admin.eonMemorialInstance = eonMemorialInstance;
      let promises = [];
      let myData = [];
      result.forEach(item => {
        promises.push(
          Admin.eonMemorialInstance.getMemorial(item+"").then(data=>{
            myData.push(data);
          })
        );
      });

      return Promise.all(promises).then(() => {
        return myData;
      });

    }).then(function(names){

      var awardRow = $('#awardRow');
      var awardTemplate = $('#awardTemplate');
      awardRow.empty();
      for (i = 0; i < names.length; i ++) {
        awardTemplate.find('.panel-name').text(names[i][0] +"(" +names[i][1]+")");
        if(namelist[names[i][2]]){
          awardTemplate.find('.panel-image').attr('src',namelist[names[i][2]].avatar);
        }
        awardTemplate.find('.born-date').text(Admin.timestampToString(names[i][4])+"-"+Admin.timestampToString(names[i][5]));
        if(namelist[names[i][2]]){
          awardTemplate.find('.bio').text(namelist[names[i][2]].detail);
        }
        awardRow.append(awardTemplate.html());
      }

    }).then(function(){
      Admin.loadAdmin();
    }).catch(function(err) {
      console.log(err.message);
    });
    
  },
  parseHexToString: function(hex) {
    const cleanHex = hex.slice(2).toString().replace(/00/g, '');
    const typedArray = new Uint8Array(cleanHex.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16);
    }))
    return new TextDecoder("utf-8").decode(typedArray.buffer);
  },
  parseStringToHex: function(str) {
    var result = '';
    for (var i=0; i<str.length; i++) {
      result += str.charCodeAt(i).toString(16);
    }
    return '0x' + result;
  },
  loadAdmin: function() {
    
    Admin.contracts.EONMemorial.deployed().then(function(instance) {
      eonMemorialInstance = instance;
      
    }).then(function(result) {
      return eonMemorialInstance.getAdminList();      
    }).then(function(list){

      var adminRow = $('#adminRow');
      var adminTemplate = $('#adminTemplate');
      adminRow.empty();
      for (i = 0; i < list.length; i ++) {
        if(list[i]=='0x0000000000000000000000000000000000000000') continue;
        adminTemplate.find('.leader-admin').text(list[i]);
        adminTemplate.find('.btn-del-admin').attr('data-id', list[i]);
        adminRow.append(adminTemplate.html());
      }
    }).catch(function(err) {
      console.log(err.message);
    });
    
  },
  generateKey: function(key) {
    return "0x"+sha256(key);
  },
  parserDate: function (date) {  
    var t = Date.parse(date);  
    if (!isNaN(t)) {  
        return new Date(Date.parse(date.replace(/-/g, "/")));  
    } else {  
        return new Date();  
    }  
  },
  stringToTimestamp: function(dateStr){
    if(dateStr==''){
      return 0;
    } else {
      var date = Admin.parserDate(dateStr);
      return date.getTime() / 1000;
    }
  },
  timestampToString: function(time){
    if(time ==0){
      return "不详";
    }
    var newDate = new Date();
    newDate.setTime(time * 1000);
    return newDate.toLocaleDateString();
  },
  handleAward: function(event) {
    event.preventDefault();

    var status = $("#newAwardForm").data('bootstrapValidator').validate();
    if (status.isValid()) {
      var c_name = $("#c_name").val();
      var e_name = $('#e_name').val();
      var key = $('#key').val();
      var type = $('#type1').checked?1:0;
      var bornDate = Admin.stringToTimestamp($('#bornDate').val());
      var diedDate = Admin.stringToTimestamp($('#diedDate').val());
  
      var id = Admin.generateKey(key);
  
      var eonMemorialInstance;
  
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
  
        var account = accounts[0];
  
        Admin.contracts.EONMemorial.deployed().then(function(instance) {
          eonMemorialInstance = instance;
        }).then(function(result) {
          return eonMemorialInstance.rewardMemorial(account,id,c_name,e_name,key,type,bornDate,diedDate,{from:account});
        }).then(function(result) {
          return Admin.loadReward();
        }).catch(function(err) {
          console.log(err.message);
        });
      });
    }
  },
  handleAddAdmin: function(event) {
    event.preventDefault();

    var admin = $("#leader-admin").val();

    var eonMemorialInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      

      Admin.contracts.EONMemorial.deployed().then(function(instance) {
        eonMemorialInstance = instance;
      }).then(function(result) {
        return eonNMemorialInstance.addAdmin(admin,{from:account});
      }).then(function(result) {
        return Admin.loadAdmin();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },
  handleRemoveAdmin: function(event) {
    event.preventDefault();

    var admin = $(event.target).data('id');

    if(admin=='0x0000000000000000000000000000000000000000'){
      return;
    }
    var eonMemorialInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }

      var account = accounts[0];
      
      Admin.contracts.EONMemorial.deployed().then(function(instance) {
        eonMemorialInstance = instance;
      }).then(function(result) {
        return eonMemorialInstance.removeAdmin(admin,{from:account});
      }).then(function(result) {
        return Admin.loadAdmin();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  }
};

$(function() {
  $(window).load(function() {
    Admin.init();
  });
});
