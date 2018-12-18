import { mergeRecursive, generateGetterSetters } from 'muze-utils';
import {
    createTree,
    combineMatrices,
    computeLogicalSpace,
    createMatrixEachLevel,
    createMatrixInstances
  } from '../utils';
import { PROPS } from './props';
import { HEIGHT, WIDTH } from '../enums/constants';
import { defaultConfig } from './default-config';

/**
 * This class used to create column / row matrix for GridLayout
 *
 * @class VisualMatrix
 */
export default class VisualMatrix {

    /**
     *Creates an instance of VisualMatrix.
     * @param {any} matrix Two set of matrices
     * @param {any} [config={}] Configuration for VisualMatrix
     * @memberof VisualMatrix
     */
    constructor (matrix, config = {}) {
        // Prepare matrices
        this._lastLevelKey = 0;
        this._primaryMatrix = matrix[0] || [];
        this._secondaryMatrix = matrix[1] || [];
        this._maxMeasures = [];
        this._availableSpace = {};

        // Store the config
        generateGetterSetters(this, PROPS);
        const defCon = Object.assign({}, this.constructor.defaultConfig());
        this.config(mergeRecursive(defCon, config));

        this._layoutMatrix = combineMatrices([matrix[0] || [], matrix[1] || []], this.config());
    }

    primaryMatrix (...params) {
        if (params.length) {
            return this;
        }
        return this._primaryMatrix;
    }

    secondaryMatrix (...params) {
        if (params.length) {
            return this;
        }
        return this._secondaryMatrix;
    }

    tree (...params) {
        if (params.length) {
            return this;
        }
        return this._tree;
    }

    static defaultConfig () {
        return defaultConfig;
    }

    createTree () {
        const { tree, lastLevelKey } = createTree(this);
        this._lastLevelKey = lastLevelKey;
        return tree;
    }

    /**
     * Computes the logical space taken by the entire matrixTree
     *
     * @return {Object} Logical space taken
     * @memberof VisualMatrix
     */
    setLogicalSpace () {
        const {
            isTransposed
        } = this.config();
        const matrixTree = this.tree();
        createMatrixEachLevel(matrixTree, isTransposed);
        return computeLogicalSpace(matrixTree, this.config(), this.maxMeasures());
    }

    /**
     * Returns the space taken by visual matrix
     *
     * @return {Object} space taken by the matrix
     * @memberof VisualMatrix
     */
    getLogicalSpace () {
        return this.logicalSpace();
    }

    /**
     * Sets the provied space to the visual matrix
     *
     * @param {number} width width provided
     * @param {number} height height provided
     * @memberof VisualMatrix
     */
    setAvailableSpace (width, height) {
        this.availableSpace({ width, height });
        const tree = this.tree();
        const heightMeasures = this.populateMaxMeasures(HEIGHT, tree);
        const widthMeasures = this.populateMaxMeasures(WIDTH, tree);
        const depth = this.calculateDepth(widthMeasures, heightMeasures);

        this.viewableMatrix = this.createViewPortMatrix(depth);
        this.viewableMeasures = this.redistributeSpaces(width, height);
        return this;
    }

    /**
     * Populate the max measures in the array
     *
     * @param {Array} measures array to be filled with max measures
     * @param {Object} matrixTree matrix tree of visual matrix
     * @param {number} measure width or height
     * @param {number} [depth=0] depth of the tree that to be calculated
     * @memberof VisualMatrix
     */
    populateMaxMeasures (type, matrixTree, depth = 0, measures = []) {
        measures[depth] = Math.max(measures[depth] || 0, matrixTree.space[type]);
        if (matrixTree.values) {
            const childDepth = depth + 1;
            matrixTree.values.forEach((child) => {
                if (child.space) {
                    measures = this.populateMaxMeasures(type, child, childDepth, measures);
                }
            });
        }
        return measures;
    }

    /**
     * Redistributes the provied space to all cells
     *
     * @param {*} viewableMatrix current viewport matrix
     * @param {*} width provied width
     * @param {*} height provied height
     * @return {Object} current viewports matrixes with measures
     * @memberof VisualMatrix
     */
    redistributeSpaces (width, height) {
        let maxHeights = [];
        let maxWidths = [];

        this.viewableMatrix.forEach((matrixInst) => {
            const matrix = matrixInst.matrix;
            const mWidth = 0;
            const mHeight = 0;
            const options = { mWidth, mHeight, matrix, width, height, maxHeights, maxWidths };
            const maxMeasures = this.redistributeViewSpaces(options);
            maxWidths = maxMeasures.maxWidths;
            maxHeights = maxMeasures.maxHeights;
        });

        return this.computeViewableSpaces({ height, width, maxHeights, maxWidths });
    }

    /**
     * Gets the viewable measures for the current viewable matrix
     *
     * @return {Object} Set of viewable measures
     * @memberof VisualMatrix
     */
    getViewableSpaces () {
        return this.viewableMeasures;
    }

    /**
     * Returns the matrix that can be viewed in the current viewport
     *
     * @return {Array} Set of matrices that can be viewed
     * @memberof VisualMatrix
     */
    getViewableData () {
        return this.viewableMatrix;
    }

    /**
     * Creates the viewport that can be viewed together
     *
     * @param {number} depth maxDepth that can be viewed in the viewport
     * @return {Array<Object>} Set of matrices that can be viewed
     * @memberof VisualMatrix
     */
    createViewPortMatrix (depth) {
        const arr = [];
        createMatrixInstances(arr, depth, this.removeExtraCells(), this);
        return arr;
    }
}

