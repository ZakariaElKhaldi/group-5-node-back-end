/**
 * Build paginated response matching PHP backend format
 */
const paginate = async (model, options = {}) => {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await model.findAndCountAll({
        ...options.query,
        limit,
        offset,
    });

    return {
        items: rows,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
    };
};

/**
 * Build Sequelize where clause from search params
 */
const buildSearchWhere = (search, fields) => {
    if (!search) return {};

    const { Op } = require('sequelize');
    return {
        [Op.or]: fields.map(field => ({
            [field]: { [Op.like]: `%${search}%` }
        }))
    };
};

module.exports = { paginate, buildSearchWhere };
