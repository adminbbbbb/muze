/* eslint-disable */

var env = muze();

var DataModel = muze.DataModel;

d3.json('../data/cars.json', function (data) {

    var jsonData = data,

        schema = [{

            name: 'Name',

            type: 'dimension'

        }, {

            name: 'Maker',

            type: 'dimension'

        }, {

            name: 'Miles_per_Gallon',

            type: 'measure'

        }, {

            name: 'Displacement',

            type: 'measure'

        }, {

            name: 'Horsepower',

            type: 'measure'

        }, {

            name: 'Weight_in_lbs',

            type: 'measure'

        }, {

            name: 'Acceleration',

            type: 'measure'

        }, {

            name: 'Origin',

            type: 'dimension'

        }, {

            name: 'Cylinders',

            type: 'dimension'

        }, {

            name: 'Year',

            type: 'dimension'

        }];

    var rootData = new DataModel(jsonData, schema);


    env = env.data(rootData)

    var mountPoint = document.getElementById('chart');

    window.canvas = env.canvas();


    rootData = rootData.groupBy(['Year', 'Origin'], {

        Horsepower: 'mean',

        Acceleration: 'mean'

    });


    var mountPoint = document.getElementById('chart');

    window.canvas = env.canvas();

    var rows = [['Acceleration']],

        columns = [['Year']];


    env.canvas()

        .height(650)

        .rows(['Acceleration'])

        .columns(['Year'])

        .color('Origin')

        .rows(['Acceleration'])

        .columns(['Year'])

        .config({

            legend: {

                color: {

                    item: {

                        text: {

                            formatter: (val, i) => {

                                return `${val}$`;

                            }

                        }

                    }

                }

            }

        })
        .title('Discrete Config')

        .mount('#chart1')

});