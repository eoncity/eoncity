App = {
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
    return await App.initWeb3();
  },

  initWeb3: async function() {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
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
      App.web3Provider = window.web3.currentProvider;
    }
    // If no injected web3 instance is detected, fall back to Ganache
    else {
      App.web3Provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/36eb857d75414a69821e77480993c291');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('EONMemorial.json', function(data) {
      var EONMemorialArtifact = data;
      App.contracts.EONMemorial = TruffleContract(EONMemorialArtifact);
      App.contracts.EONMemorial.setProvider(App.web3Provider);
    
      return App.loadReward();
    });
    
    return App.bindEvents();
  },

  bindEvents: function() {
    
  },
  
  loadReward: function() {
    var namelist = {};
    $.getJSON('profile/list.json', function(data) {
      namelist = data;
    });
    App.contracts.EONMemorial.deployed().then(function(instance) {
      eonMemorialInstance = instance;
      
    }).then(function(result) {
      return eonMemorialInstance.getMemorialList();      
    }).then(function(result) {

      App.eonMemorialInstance = eonMemorialInstance;
      let promises = [];
      let myData = [];
      result.forEach(item => {
        promises.push(
          App.eonMemorialInstance.getMemorial(item+"").then(data=>{
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
        if(names[i][0]==0) continue;

        awardTemplate.find('.panel-name').text(names[i][0]);
        if(namelist[names[i][2]]){
          awardTemplate.find('.panel-image').attr('src',namelist[names[i][2]].avatar);
        }
        awardTemplate.find('.born-date').text(App.timestampToString(names[i][4])+"-"+App.timestampToString(names[i][5]));
        if(namelist[names[i][2]]){
          awardTemplate.find('.bio').text(namelist[names[i][2]].detail);
        }

        awardRow.append(awardTemplate.html());
      }

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
      var date = App.parserDate(dateStr);
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
  
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
