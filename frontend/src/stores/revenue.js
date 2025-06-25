import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

axios.interceptors.request.use(

  (config) => {

    const token = localStorage.getItem('token')

    if (token) {

      config.headers.Authorization = `Bearer ${token}`

    }

    return config

  },

  (error) => Promise.reject(error)

)
export const useRevenueStore = defineStore('revenue', {
  state: () => ({
    revenueData: [],
    monthlyData: [],
    summary: {},
    pagination: {
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0
    },
    loading: false,
    monthlyLoading: false,
    error: null,
    lastUpdated: null,
    monthlyDetailData: null,
    monthlyDetailLoading: false,
  }),

  getters: {
    totalRevenue: (state) => {
      return state.revenueData.reduce((total, item) => total + parseFloat(item.amount || 0), 0)
    },
    
    aeronautikaRevenue: (state) => {
      return state.revenueData
        .filter(item => item.category === 'aeronautika')
        .reduce((total, item) => total + parseFloat(item.amount || 0), 0)
    },
    
    nonAeronautikaRevenue: (state) => {
      return state.revenueData
        .filter(item => item.category === 'non-aeronautika')
        .reduce((total, item) => total + parseFloat(item.amount || 0), 0)
    },

    topServices: (state) => {
      const serviceMap = {}
      state.revenueData.forEach(item => {
        if (!serviceMap[item.service_type]) {
          serviceMap[item.service_type] = 0
        }
        serviceMap[item.service_type] += parseFloat(item.amount || 0)
      })
      
      return Object.entries(serviceMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
    },

    topPartners: (state) => {
      const partnerMap = {}
      const total = state.totalRevenue
      
      state.revenueData.forEach(item => {
        if (!partnerMap[item.partner]) {
          partnerMap[item.partner] = {
            name: item.partner,
            amount: 0,
            transactions: 0
          }
        }
        partnerMap[item.partner].amount += parseFloat(item.amount || 0)
        partnerMap[item.partner].transactions += 1
      })
      
      return Object.values(partnerMap)
        .map(partner => ({
          ...partner,
          percentage: total > 0 ? ((partner.amount / total) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
    }
  },

  actions: {
    async fetchRevenueData(params = {}) {
      this.loading = true
      this.error = null
      
      try {
        const response = await axios.get(`${API_URL}/revenue`, { params })
        
        if (response.data.data) {
          this.revenueData = response.data.data
          this.pagination = response.data.pagination
        } else {
          this.revenueData = response.data
        }
        
        this.lastUpdated = new Date().toISOString()
      } catch (error) {
        this.error = error.response?.data?.message || 'Gagal mengambil data pendapatan'
        console.error('Fetch revenue error:', error)
      } finally {
        this.loading = false
      }
    },
    async fetchMonthlyDetail(year, month, filters = {}) {

  this.monthlyDetailLoading = true

  

  try {

    const params = { year, month, ...filters }

    const response = await axios.get(`${API_URL}/revenue/monthly-detail`, { params })

    this.monthlyDetailData = response.data

    return response.data

  } catch (error) {

    this.error = error.response?.data?.message || 'Gagal mengambil detail bulanan'

    console.error('Fetch monthly detail error:', error)

  } finally {

    this.monthlyDetailLoading = false

  }

},


clearMonthlyDetail() {

  this.monthlyDetailData = null

},

    async fetchMonthlyData(year = null) {
      this.monthlyLoading = true
      
      try {
        const params = year ? { year } : {}
        const response = await axios.get(`${API_URL}/revenue/monthly`, { params })
        this.monthlyData = response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Gagal mengambil data bulanan'
        console.error('Fetch monthly data error:', error)
      } finally {
        this.monthlyLoading = false
      }
    },

    async fetchSummary(year = null) {
      try {
        const params = year ? { year } : {}
        const response = await axios.get(`${API_URL}/revenue/summary`, { params })
        this.summary = response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Gagal mengambil ringkasan'
        console.error('Fetch summary error:', error)
      }
    },

    async addRevenueData(data) {
      try {
        const response = await axios.post(`${API_URL}/revenue`, data)
        this.revenueData.unshift(response.data)
        
        // Auto refresh all data after adding new data
        await this.fetchMonthlyData()
        
        return { success: true, data: response.data }
      } catch (error) {
        const message = error.response?.data?.message || 'Gagal menambah data'
        return { success: false, message }
      }
    },

    async updateRevenueData(id, data) {
      try {
        const response = await axios.put(`${API_URL}/revenue/${id}`, data)
        const index = this.revenueData.findIndex(item => item.id === id)
        if (index !== -1) {
          this.revenueData[index] = response.data
        }
        
        // Auto refresh monthly data after update
        await this.fetchMonthlyData()
        
        return { success: true, data: response.data }
      } catch (error) {
        const message = error.response?.data?.message || 'Gagal update data'
        return { success: false, message }
      }
    },

    async deleteRevenueData(id) {
      try {
        await axios.delete(`${API_URL}/revenue/${id}`)
        this.revenueData = this.revenueData.filter(item => item.id !== id)
        
        // Auto refresh monthly data after delete
        await this.fetchMonthlyData()
        
        return { success: true }
      } catch (error) {
        const message = error.response?.data?.message || 'Gagal hapus data'
        return { success: false, message }
      }
    },

    // Real-time refresh all data
    async refreshAllData(year = null) {
      const promises = [
        this.fetchRevenueData(year ? { year } : {}),
        this.fetchMonthlyData(year),
        this.fetchSummary(year)
      ]
      
      await Promise.all(promises)
    },

    // Clear all data (for reset)
    clearAllData() {
      this.revenueData = []
      this.monthlyData = []
      this.summary = {}
      this.lastUpdated = null
    }
  }
})