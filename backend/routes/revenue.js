const express = require('express')
const { body, validationResult } = require('express-validator')
const { Op, fn, col, literal } = require('sequelize')
const Revenue = require('../models/Revenue')
const auth = require('../middleware/auth')

const router = express.Router()

// Get all revenue data
router.get('/', auth, async (req, res) => {
  try {
    const { year, month, category, payment_status, page = 1, limit = 100 } = req.query
    
    let whereClause = {}
    
    // Filter by year
    if (year) {
      whereClause.date = {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`]
      }
    }
    
    // Filter by month
    if (month && year) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      whereClause.date = {
        [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      }
    }
    
    // Filter by category
    if (category) {
      whereClause.category = category
    }
    
    // Filter by payment status
    if (payment_status) {
      whereClause.payment_status = payment_status
    }

    const offset = (page - 1) * limit

    const { count, rows } = await Revenue.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    })

    res.json({
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Get revenue error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get detailed monthly transactions
router.get('/monthly-detail', auth, async (req, res) => {
  try {
    const { year, month, partner, service_type, category, sort = 'date', order = 'DESC' } = req.query
    
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' })
    }

    let whereClause = {}
    
    // Filter by specific month and year
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    whereClause.date = {
      [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    }
    
    // Additional filters
    if (partner) {
      whereClause.partner = { [Op.like]: `%${partner}%` }
    }
    
    if (service_type) {
      whereClause.service_type = service_type
    }
    
    if (category) {
      whereClause.category = category
    }

    // Get detailed transactions
    const transactions = await Revenue.findAll({
      where: whereClause,
      order: [[sort, order.toUpperCase()]],
      attributes: [
        'id', 'date', 'partner', 'category', 'service_type', 
        'amount', 'payment_status', 'payment_method', 'description', 'invoice_number'
      ]
    })

    // Get summary statistics
    const summary = await Revenue.findAll({
      attributes: [
        [fn('SUM', col('amount')), 'totalAmount'],
        [fn('COUNT', col('id')), 'totalTransactions'],
        [fn('SUM', literal("CASE WHEN category = 'aeronautika' THEN amount ELSE 0 END")), 'aeronautikaAmount'],
        [fn('SUM', literal("CASE WHEN category = 'non-aeronautika' THEN amount ELSE 0 END")), 'nonAeronautikaAmount'],
        [fn('COUNT', literal("CASE WHEN category = 'aeronautika' THEN 1 END")), 'aeronautikaCount'],
        [fn('COUNT', literal("CASE WHEN category = 'non-aeronautika' THEN 1 END")), 'nonAeronautikaCount']
      ],
      where: whereClause
    })

    // Get breakdown by partner
    const partnerBreakdown = await Revenue.findAll({
      attributes: [
        'partner',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: whereClause,
      group: ['partner'],
      order: [[fn('SUM', col('amount')), 'DESC']]
    })

    // Get breakdown by service type
    const serviceBreakdown = await Revenue.findAll({
      attributes: [
        'service_type',
        'category',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: whereClause,
      group: ['service_type', 'category'],
      order: [[fn('SUM', col('amount')), 'DESC']]
    })

    const summaryData = summary[0] ? summary[0].dataValues : {
      totalAmount: 0,
      totalTransactions: 0,
      aeronautikaAmount: 0,
      nonAeronautikaAmount: 0,
      aeronautikaCount: 0,
      nonAeronautikaCount: 0
    }

    res.json({
      period: {
        year: parseInt(year),
        month: parseInt(month),
        monthName: new Date(year, month - 1).toLocaleString('id-ID', { month: 'long' })
      },
      summary: {
        totalAmount: parseFloat(summaryData.totalAmount) || 0,
        totalTransactions: parseInt(summaryData.totalTransactions) || 0,
        aeronautikaAmount: parseFloat(summaryData.aeronautikaAmount) || 0,
        nonAeronautikaAmount: parseFloat(summaryData.nonAeronautikaAmount) || 0,
        aeronautikaCount: parseInt(summaryData.aeronautikaCount) || 0,
        nonAeronautikaCount: parseInt(summaryData.nonAeronautikaCount) || 0
      },
      transactions: transactions,
      breakdown: {
        byPartner: partnerBreakdown.map(item => ({
          partner: item.dataValues.partner,
          amount: parseFloat(item.dataValues.total),
          count: parseInt(item.dataValues.count)
        })),
        byService: serviceBreakdown.map(item => ({
          serviceType: item.dataValues.service_type,
          category: item.dataValues.category,
          amount: parseFloat(item.dataValues.total),
          count: parseInt(item.dataValues.count)
        }))
      }
    })

  } catch (error) {
    console.error('Get monthly detail error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get monthly revenue summary
router.get('/monthly', auth, async (req, res) => {
  try {
    const { year } = req.query
    const currentYear = year || new Date().getFullYear()

    const monthlyData = await Revenue.findAll({
      attributes: [
        [fn('MONTH', col('date')), 'month'],
        [fn('YEAR', col('date')), 'year'],
        'category',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        date: {
          [Op.between]: [`${currentYear}-01-01`, `${currentYear}-12-31`]
        }
      },
      group: ['month', 'year', 'category'],
      order: [['month', 'ASC']]
    })

    // Process data into monthly format
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = months.map((monthName, index) => {
      const monthNumber = index + 1
      const monthData = monthlyData.filter(item => item.dataValues.month === monthNumber)
      
      const aeronautika = monthData.find(item => item.dataValues.category === 'aeronautika')
      const nonAeronautika = monthData.find(item => item.dataValues.category === 'non-aeronautika')
      
      return {
        month: monthName,
        aeronautika: aeronautika ? parseFloat(aeronautika.dataValues.total) : 0,
        nonAeronautika: nonAeronautika ? parseFloat(nonAeronautika.dataValues.total) : 0,
        total: (aeronautika ? parseFloat(aeronautika.dataValues.total) : 0) + 
               (nonAeronautika ? parseFloat(nonAeronautika.dataValues.total) : 0),
        transactions: (aeronautika ? parseInt(aeronautika.dataValues.count) : 0) + 
                     (nonAeronautika ? parseInt(nonAeronautika.dataValues.count) : 0)
      }
    })

    res.json(result)

  } catch (error) {
    console.error('Get monthly revenue error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get revenue summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { year } = req.query
    const currentYear = year || new Date().getFullYear()

    // Get overall summary
    const summary = await Revenue.findAll({
      attributes: [
        [fn('SUM', col('amount')), 'totalRevenue'],
        [fn('COUNT', col('id')), 'totalTransactions'],
        [fn('SUM', literal("CASE WHEN category = 'aeronautika' THEN amount ELSE 0 END")), 'aeronautikaRevenue'],
        [fn('SUM', literal("CASE WHEN category = 'non-aeronautika' THEN amount ELSE 0 END")), 'nonAeronautikaRevenue'],
        [fn('SUM', literal("CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END")), 'paidAmount'],
        [fn('SUM', literal("CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END")), 'pendingAmount'],
        [fn('SUM', literal("CASE WHEN payment_status = 'overdue' THEN amount ELSE 0 END")), 'overdueAmount']
      ],
      where: {
        date: {
          [Op.between]: [`${currentYear}-01-01`, `${currentYear}-12-31`]
        }
      }
    })

    // Get top services
    const topServices = await Revenue.findAll({
      attributes: [
        'service_type',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        date: {
          [Op.between]: [`${currentYear}-01-01`, `${currentYear}-12-31`]
        }
      },
      group: ['service_type'],
      order: [[fn('SUM', col('amount')), 'DESC']],
      limit: 10
    })

    // Get top partners
    const topPartners = await Revenue.findAll({
      attributes: [
        'partner',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        date: {
          [Op.between]: [`${currentYear}-01-01`, `${currentYear}-12-31`]
        }
      },
      group: ['partner'],
      order: [[fn('SUM', col('amount')), 'DESC']],
      limit: 10
    })

    const summaryData = summary[0] ? summary[0].dataValues : {
      totalRevenue: 0,
      totalTransactions: 0,
      aeronautikaRevenue: 0,
      nonAeronautikaRevenue: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0
    }

    res.json({
      summary: {
        totalRevenue: parseFloat(summaryData.totalRevenue) || 0,
        totalTransactions: parseInt(summaryData.totalTransactions) || 0,
        aeronautikaRevenue: parseFloat(summaryData.aeronautikaRevenue) || 0,
        nonAeronautikaRevenue: parseFloat(summaryData.nonAeronautikaRevenue) || 0,
        paidAmount: parseFloat(summaryData.paidAmount) || 0,
        pendingAmount: parseFloat(summaryData.pendingAmount) || 0,
        overdueAmount: parseFloat(summaryData.overdueAmount) || 0
      },
      topServices: topServices.map(service => ({
        name: service.dataValues.service_type,
        amount: parseFloat(service.dataValues.total),
        count: parseInt(service.dataValues.count)
      })),
      topPartners: topPartners.map(partner => ({
        name: partner.dataValues.partner,
        amount: parseFloat(partner.dataValues.total),
        count: parseInt(partner.dataValues.count)
      }))
    })

  } catch (error) {
    console.error('Get summary error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Add new revenue data
router.post('/', [
  auth,
  body('date').isISO8601().withMessage('Format tanggal tidak valid'),
  body('partner').notEmpty().withMessage('Nama partner wajib diisi'),
  body('category').isIn(['aeronautika', 'non-aeronautika']).withMessage('Kategori tidak valid'),
  body('service_type').notEmpty().withMessage('Jenis layanan wajib diisi'),
  body('amount').isNumeric().withMessage('Jumlah harus berupa angka'),
  body('payment_status').isIn(['paid', 'pending', 'overdue']).withMessage('Status pembayaran tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const {
      date, partner, category, service_type, amount,
      invoice_number, payment_status, payment_method,
      description, period_start, period_end
    } = req.body

    const revenue = await Revenue.create({
      date,
      partner,
      category,
      service_type,
      amount: parseFloat(amount),
      invoice_number,
      payment_status,
      payment_method,
      description,
      period_start: period_start || null,
      period_end: period_end || null
    })

    res.status(201).json(revenue)

  } catch (error) {
    console.error('Add revenue error:', error)
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Nomor invoice sudah digunakan' })
    }
    
    res.status(500).json({ message: 'Server error' })
  }
})

// Update revenue data
router.put('/:id', [
  auth,
  body('date').optional().isISO8601().withMessage('Format tanggal tidak valid'),
  body('partner').optional().notEmpty().withMessage('Nama partner wajib diisi'),
  body('category').optional().isIn(['aeronautika', 'non-aeronautika']).withMessage('Kategori tidak valid'),
  body('service_type').optional().notEmpty().withMessage('Jenis layanan wajib diisi'),
  body('amount').optional().isNumeric().withMessage('Jumlah harus berupa angka'),
  body('payment_status').optional().isIn(['paid', 'pending', 'overdue']).withMessage('Status pembayaran tidak valid')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const revenue = await Revenue.findByPk(req.params.id)
    if (!revenue) {
      return res.status(404).json({ message: 'Data pendapatan tidak ditemukan' })
    }

    const updateData = { ...req.body }
    if (updateData.amount) {
      updateData.amount = parseFloat(updateData.amount)
    }

    await revenue.update(updateData)
    
    res.json(revenue)

  } catch (error) {
    console.error('Update revenue error:', error)
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Nomor invoice sudah digunakan' })
    }
    
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete revenue data
router.delete('/:id', auth, async (req, res) => {
  try {
    const revenue = await Revenue.findByPk(req.params.id)
    if (!revenue) {
      return res.status(404).json({ message: 'Data pendapatan tidak ditemukan' })
    }

    await revenue.destroy()
    res.json({ message: 'Data pendapatan berhasil dihapus' })

  } catch (error) {
    console.error('Delete revenue error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get monthly revenue summary dengan format yang lebih detail
router.get('/monthly', auth, async (req, res) => {
  try {
    const { year } = req.query
    const currentYear = year || new Date().getFullYear()

    const monthlyData = await Revenue.findAll({
      attributes: [
        [fn('MONTH', col('date')), 'month'],
        [fn('YEAR', col('date')), 'year'],
        'category',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        date: {
          [Op.between]: [`${currentYear}-01-01`, `${currentYear}-12-31`]
        }
      },
      group: ['month', 'year', 'category'],
      order: [['month', 'ASC']]
    })

    // Process data into monthly format
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const result = months.map((monthName, index) => {
      const monthNumber = index + 1
      const monthData = monthlyData.filter(item => item.dataValues.month === monthNumber)
      
      const aeronautika = monthData.find(item => item.dataValues.category === 'aeronautika')
      const nonAeronautika = monthData.find(item => item.dataValues.category === 'non-aeronautika')
      
      const aeroAmount = aeronautika ? parseFloat(aeronautika.dataValues.total) : 0
      const nonAeroAmount = nonAeronautika ? parseFloat(nonAeronautika.dataValues.total) : 0
      
      return {
        month: monthName,
        aeronautika: aeroAmount,
        nonAeronautika: nonAeroAmount,
        total: aeroAmount + nonAeroAmount,
        transactions: (aeronautika ? parseInt(aeronautika.dataValues.count) : 0) + 
                     (nonAeronautika ? parseInt(nonAeronautika.dataValues.count) : 0)
      }
    })

    res.json(result)

  } catch (error) {
    console.error('Get monthly revenue error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router