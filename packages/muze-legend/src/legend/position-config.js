import {
    LEFT,
    RIGHT,
    START,
    END,
    TOP,
    BOTTOM,
    HORIZONTAL,
    VERTICAL,
    CENTER,
    SHAPE,
    VALUE,
    MARGINBUFFER
} from '../enums/constants';

const legendOrientation = {
    [HORIZONTAL]: {
        datasets: data => ({
            row: [1],
            column: data
        }),
        itemContainerMeasures: (measurement) => {
            const {
                itemSpaces,
                width
            } = measurement;
            return {
                row: {
                    width: `${width + itemSpaces.length * MARGINBUFFER}px`,
                    padding: `${0}px`
                },
                column: {
                    width: (d, i) => `${itemSpaces[i].width + MARGINBUFFER}px`,
                    padding: `${0}px`
                }
            };
        },
        getStepSpacesInfo: (measurement) => {
            const { maxItemSpaces, height } = measurement;
            return {
                iconHeight: height,
                iconWidth: maxItemSpaces.width,
                stepPadding: {
                    horizontal: true,
                    vertical: false
                }
            };
        }
    },
    [VERTICAL]: {
        datasets: data => ({
            row: data,
            column: d => [d]
        }),
        itemContainerMeasures: (measurement, config) => {
            const {
                width
            } = measurement;
            const { padding } = config;

            return {
                row: {
                    width: `${width + MARGINBUFFER}px`,
                    padding: `${padding}px`
                },
                column: {
                    width: `${width + MARGINBUFFER}px`,
                    padding: `${0}px`
                }
            };
        },
        getStepSpacesInfo: (measurement) => {
            const { maxItemSpaces, width } = measurement;
            return {
                iconHeight: maxItemSpaces.height,
                iconWidth: width,
                stepPadding: {
                    horizontal: false,
                    vertical: true
                }
            };
        }
    }
};

export const positionConfig = {
    [LEFT]: legendOrientation[VERTICAL],
    [RIGHT]: legendOrientation[VERTICAL],
    [TOP]: legendOrientation[HORIZONTAL],
    [BOTTOM]: legendOrientation[HORIZONTAL]
};

export const alignmentMap = {
    [LEFT]: END,
    [RIGHT]: START,
    [TOP]: CENTER,
    [BOTTOM]: CENTER
};

// Reverses data for step legend
export const stepData = data => ({
    [LEFT]: data.reverse(),
    [RIGHT]: data.reverse(),
    [TOP]: data,
    [BOTTOM]: data
});

// Changes the item layout based on the position of the text
export const itemStack = {
    [LEFT]: [VALUE, SHAPE],
    [RIGHT]: [SHAPE, VALUE],
    [TOP]: [VALUE, SHAPE],
    [BOTTOM]: [SHAPE, VALUE]
};
