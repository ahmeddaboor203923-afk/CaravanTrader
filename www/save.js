// =========================
// نظام الحفظ
// =========================

const SaveSystem = {

    data: {},

    load(){

        const save =
        localStorage.getItem("gameSave");

        if(save){

            this.data = JSON.parse(save);

        }else{

            this.data = {

                worldExists:false,

                language:"ar",

                masterVolume:70,

                musicVolume:70,

                quality:"high",

                resources:{
                    wood:0,
                    stone:0,
                    food:0,
                    coal:0
                },

                player:{
                    x:0,
                    y:0
                }

            };

        }

    },

    save(){

        localStorage.setItem(
            "gameSave",
            JSON.stringify(this.data)
        );

    },

    delete(){

        localStorage.removeItem("gameSave");

        this.load();

    }

};

SaveSystem.load();
