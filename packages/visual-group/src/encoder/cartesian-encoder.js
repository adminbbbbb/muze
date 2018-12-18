import { layerFactory } from '@chartshq/visual-layer';
import { mergeRecursive, STATE_NAMESPACES, unionDomain, FieldType } from 'muze-utils';
import {
    generateAxisFromMap,
    getDefaultMark,
    getIndex,
    getLayerConfFromFields,
    getAdjustedDomain
} from './encoder-helper';
import { retriveDomainFromData } from '../group-helper';

import { ROW, COLUMN, COL, LEFT, TOP, CARTESIAN, MEASURE, BOTH, X, Y } from '../enums/constants';
import VisualEncoder from './visual-encoder';

/**
 *
 *
 * @export
 * @class CartesianEncoder
 * @extends {VisualEncoder}
 */
export default class CartesianEncoder extends VisualEncoder {

    /**
     *
     *
     *
     * @memberof CartesianEncoder
     */
    static type () {
        return CARTESIAN;
    }

    /**
     *
     *
     * @param {*} axesCreators
     * @param {*} fieldInfo
     *
     * @memberof CartesianEncoder
     */
    createAxis (axesCreators, fieldInfo) {
        const geomCellAxes = {};
        const {
            axes
        } = axesCreators;
        const {
            projections,
            indices
        } = fieldInfo;
        const {
            rowFields,
            columnFields
        } = projections;
        const {
             rowIndex,
             columnIndex
        } = indices;
        const axisFields = [{
            fields: rowFields,
            index: rowIndex
        }, {
            fields: columnFields,
            index: columnIndex
        }];
        const xAxes = axes.x || [];
        const yAxes = axes.y || [];

        [rowFields, columnFields].forEach((fields, i) => {
            const type = i === 0 ? ROW : COLUMN;
            const axis = i === 0 ? Y : X;

            if (fields.length > 1) {
                axesCreators.position = BOTH;
            } else {
                axesCreators.position = this.axisFrom()[type];
            }
            geomCellAxes[axis] = generateAxisFromMap(axis, axisFields[i], axesCreators, axis === X ? xAxes : yAxes);
        });
        return geomCellAxes;
    }

    updateDomains (store, axes) {
        const xAxes = axes.x;
        const yAxes = axes.y;
        store.model.lock();
        for (let i = 0; i < xAxes.length; i++) {
            for (let j = 0; j < xAxes[i].length; j++) {
                store.commit(`${STATE_NAMESPACES.GROUP_GLOBAL_NAMESPACE}.domain.x.${0}${i}0`, xAxes[i][j].domain());
            }
        }
        for (let i = 0; i < yAxes.length; i++) {
            for (let j = 0; j < yAxes[i].length; j++) {
                store.commit(`${STATE_NAMESPACES.GROUP_GLOBAL_NAMESPACE}.domain.y.${i}${0}0`, yAxes[i][j].domain());
                yAxes[i][j]._domainLock = false;
            }
        }

        store.model.unlock();
    }

    unionUnitDomains (context) {
        const store = context.store();
        const unitDomains = store.get(`${STATE_NAMESPACES.UNIT_GLOBAL_NAMESPACE}.domain`);
        const resolver = context.resolver();
        const units = resolver.units();
        const domains = {
            0: {},
            1: {}
        };

        for (let rIdx = 0, len = units.length; rIdx < len; rIdx++) {
            const unitsArr = units[rIdx];
            for (let cIdx = 0, len2 = unitsArr.length; cIdx < len2; cIdx++) {
                const unit = unitsArr[cIdx];
                const axisFields = unit.fields();
                [axisFields.x, axisFields.y].forEach((fieldArr, axisType) => {
                    fieldArr.forEach((field, axisIndex) => {
                        const key = !axisType ? `0${cIdx}${axisIndex}` : `${rIdx}0${axisIndex}`;
                        const dom = unitDomains[`${rIdx}${cIdx}`];
                        if (dom && Object.keys(dom).length !== 0) {
                            domains[axisType][key] = unionDomain([(domains[axisType] && domains[axisType][key]) || [],
                                dom[`${field}`]], field.subtype());
                        }
                    });
                });
            }
        }

        const { x: xAxes, y: yAxes } = resolver.axes();
        store.model.lock();
        [xAxes, yAxes].forEach((axesArr, axisType) => {
            axesArr.forEach((axes, idx) => {
                const min = [];
                const max = [];
                let domain = [];
                let adjustedDomain = [];
                if (axes.length > 1 && axes[0].constructor.type() === 'linear' && axes[0].config().alignZeroLine) {
                    axes.forEach((axis, i) => {
                        const key = !axisType ? `0${idx}${i}` : `${idx}0${i}`;
                        domain = domains[axisType][key];
                        min[i] = domain[0];
                        max[i] = domain[1];
                    });
                    adjustedDomain = getAdjustedDomain(max, min);
                }

                axes.forEach((axis, index) => {
                    const key = !axisType ? `0${idx}${index}` : `${idx}0${index}`;
                    domain = adjustedDomain[index] || domains[axisType][key];
                    axis.domain(domain);
                    const type = !axisType ? 'x' : 'y';
                    store.commit(`${STATE_NAMESPACES.GROUP_GLOBAL_NAMESPACE}.domain.${type}.${key}`, domain);
                });
            });
        });
        store.model.unlock();
    }

    /**
     *
     *
     * @param {*} domain
     *
     * @memberof VisualUnit
     */
    updateAxisDomain (domain) {
        ['x', 'y'].forEach((type) => {
            const axes = this.axes()[type];
            let min = [];
            let max = [];
            let dom;
            axes && axes.forEach((axis, i) => {
                const field = this.fields()[type][i];
                dom = domain[`${this.fields()[type][i]}`];

                if (field.type() !== FieldType.DIMENSION && dom) {
                    min[i] = dom[0];
                    max[i] = dom[1];
                }
            });
            if (axes) {
                if (axes.length > 1) {
                    const axisConf = axes[0].config();
                    if (axes[0].constructor.type() === 'linear') {
                        if (axisConf.alignZeroLine) {
                            axes.forEach(axis => axis.config({
                                nice: false
                            }));
                            const adjustedDomain = getAdjustedDomain(max, min);
                            min = adjustedDomain.min;
                            max = adjustedDomain.max;
                        }

                        axes[0].updateDomainCache([min[0], max[0]]);
                        axes[1].updateDomainCache([min[1], max[1]]);
                    } else {
                        axes[0].updateDomainCache(dom);
                        axes[1].updateDomainCache(dom);
                    }
                } else {
                    axes[0].updateDomainCache(dom);
                }
            }
        });
        return this;
    }

    /**
     *
     *
     * @param {*} fields
     *
     * @memberof CartesianEncoder
     */
    getFacetsAndProjections (fields, type) {
        let facets = [];
        let projections = [];
        let counter = 0;
        const primaryFacets = [];
        const secondaryFacets = [];
        const primaryFields = fields[0];
        const secondaryFields = fields[1];
        const primaryLen = primaryFields.length;
        const secondaryLen = secondaryFields.length;
        const axisFrom = this.axisFrom();

        for (let i = 0; i < primaryLen; i++) {
            let projArr = [primaryFields[i]];
            const primaryField = primaryFields[i];

            if (primaryField.type() === MEASURE) {
                const secondaryField = secondaryFields[counter];
                if (secondaryField && secondaryField.type() === MEASURE) {
                    counter++;
                    projArr = [primaryField, secondaryField];
                }
                projections.push(projArr);
            } else {
                facets.push(primaryField);
                primaryFacets.push(primaryField);
            }
        }
        if (secondaryLen > counter) {
            for (let i = counter; i < secondaryLen; i++) {
                const secondaryField = secondaryFields[i];
                const projArr = [secondaryField];
                if (secondaryField.type() === MEASURE) {
                    projections.push(projArr);
                } else {
                    facets.push(secondaryField);
                    secondaryFacets.push(secondaryField);
                }
            }
        }
        if ((primaryFacets.length || secondaryFacets.length) && !projections.length) {
            type = type === COL ? COLUMN : type;
            if ((axisFrom[type] === LEFT || axisFrom[type] === TOP) && primaryFacets.length) {
                const axisFromIndex = primaryFacets.length - 1;
                const facet = primaryFacets[axisFromIndex];
                projections = [[facet]];
                const existIndex = getIndex(secondaryFacets, facet);
                if (existIndex > -1) {
                    projections = [[facet, facet]];
                    secondaryFacets.splice(existIndex, 1);
                }
                primaryFacets.splice(axisFromIndex, 1);
            } else {
                const axisFromIndex = 0;
                const facet = secondaryFacets[axisFromIndex];
                projections = [[facet]];
                const existIndex = getIndex(primaryFacets, facet);
                if (existIndex > -1) {
                    projections = [[facet, facet]];
                    primaryFacets.splice(existIndex, 1);
                }
                secondaryFacets.splice(axisFromIndex, 1);
            }
        }

        facets = [...primaryFacets, ...secondaryFacets];
        facets = facets.filter((el, index, self) => index === self.findIndex(t => (t.toString() === el.toString())));
        return {
            facets,
            projections
        };
    }

    /**
     *
     *
     * @param {*} datamodel
     * @param {*} config
     *
     * @memberof CartesianEncoder
     */
    fieldSanitizer (datamodel, config) {
        return super.fieldSanitizer(datamodel, config);
    }

    /**
     *
     *
     * @param {*} datamodel
     *
     * @memberof CartesianEncoder
     */
    getRetinalFieldsDomain (dataModels, encoding) {
        const groupedModel = dataModels.groupedModel;
        const domains = {};
        for (const key in encoding) {
            if ({}.hasOwnProperty.call(encoding, key)) {
                const encodingObj = encoding[key];
                const field = encodingObj.field;
                if (!encodingObj.domain && field) {
                    const domain = retriveDomainFromData(groupedModel, field);
                    domains[field] = domain;
                }
            }
        }
        return domains;
    }

    /**
     *
     *
     * @param {*} layerArray
     * @memberof CartesianEncoder
     */
    serializeLayerConfig (layerArray) {
        const serializedLayers = [];
        // let currentLayerIndex = 0;
        layerArray.length && layerArray.forEach((layer, i) => {
            const def = layerFactory.sanitizeLayerConfig(layer);
            def.order = i;
            serializedLayers.push(def);
        });
        return serializedLayers;
    }

    /**
     *
     *
     * @param {*} fields
     * @param {*} userLayerConfig
     *
     * @memberof CartesianEncoder
     */
    getLayerConfig (fields, userLayerConfig) {
        const layerConfig = [];
        const {
            columnFields,
            rowFields
        } = fields;

        // let currentLayerIndex = 0;
        columnFields.forEach((colField) => {
            const colFieldName = colField.toString();
            rowFields.forEach((rowField) => {
                let configs = [];
                const rowFieldName = rowField.toString();
                const encoding = {
                    x: {
                        field: colFieldName
                    },
                    y: {
                        field: rowFieldName
                    }
                };
                const rowFieldType = rowField.subtype();
                const colFieldType = colField.subtype();
                const mark = getDefaultMark(colFieldType, rowFieldType);

                const defConfigs = [{
                    mark,
                    def: {
                        mark,
                        encoding
                    }
                }];

                const layerConfigs = getLayerConfFromFields(colField.getMembers(),
                    rowField.getMembers(), userLayerConfig || []);
                if (layerConfigs.length) {
                    configs = layerConfigs.map((layerConf) => {
                        const mergedLayerConf = mergeRecursive(mergeRecursive({}, defConfigs[0].def), layerConf);
                        const serializedLayerConfig = layerFactory.getSerializedConf(mergedLayerConf.mark,
                            mergedLayerConf);
                        return {
                            mark: mergedLayerConf.mark,
                            order: mergedLayerConf.order,
                            def: serializedLayerConfig
                        };
                    });
                } else {
                    configs = defConfigs;
                }

                layerConfig.push(...configs);
            });
        });
        return layerConfig;
    }
}
