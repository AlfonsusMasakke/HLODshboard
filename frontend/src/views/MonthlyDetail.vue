<template>
  <div class="monthly-detail">
    <!-- Header -->
    <div class="detail-header">
      <div class="header-left">
        <button @click="goBack" class="back-btn">
          <i class="fas fa-arrow-left"></i>
          Kembali ke Dashboard
        </button>
        <div class="header-title">
          <h1>Detail Pendapatan Bulanan</h1>
          <p v-if="detailData">{{ detailData.period.monthName }} {{ detailData.period.year }}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="month-navigator">
          <button @click="previousMonth" class="nav-btn" :disabled="loading">
            <i class="fas fa-chevron-left"></i>
          </button>
          <select v-model="selectedMonth" @change="changeMonth" class="month-select">
            <option v-for="month in months" :key="month.value" :value="month.value">
              {{ month.label }}
            </option>
          </select>
          <select v-model="selectedYear" @change="changeMonth" class="year-select">
            <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
          </select>
          <button @click="nextMonth" class="nav-btn" :disabled="loading">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        <button @click="exportToExcel" class="export-btn" :disabled="loading || !detailData">
          <i class="fas fa-file-excel"></i>
          Export Excel
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Memuat detail pendapatan...</span>
    </div>

    <!-- Content -->
    <div v-else-if="detailData" class="detail-content">
      <!-- Summary Cards -->
      <div class="summary-section">
        <div class="summary-card total">
          <div class="card-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="card-content">
            <h3>Total Pendapatan</h3>
            <p class="amount">{{ formatCurrency(detailData.summary.totalAmount) }}</p>
            <span class="count">{{ detailData.summary.totalTransactions }} transaksi</span>
          </div>
        </div>

        <div class="summary-card aeronautika">
          <div class="card-icon">
            <i class="fas fa-plane"></i>
          </div>
          <div class="card-content">
            <h3>Aeronautika</h3>
            <p class="amount">{{ formatCurrency(detailData.summary.aeronautikaAmount) }}</p>
            <span class="count">{{ detailData.summary.aeronautikaCount }} transaksi</span>
          </div>
        </div>

        <div class="summary-card non-aeronautika">
          <div class="card-icon">
            <i class="fas fa-building"></i>
          </div>
          <div class="card-content">
            <h3>Non-Aeronautika</h3>
            <p class="amount">{{ formatCurrency(detailData.summary.nonAeronautikaAmount) }}</p>
            <span class="count">{{ detailData.summary.nonAeronautikaCount }} transaksi</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-container">
          <h3>Breakdown per Partner</h3>
          <PartnerChart :data="detailData.breakdown.byPartner" />
        </div>
        <div class="chart-container">
          <h3>Breakdown per Service Type</h3>
          <ServiceChart :data="detailData.breakdown.byService" />
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filters-header">
          <h3>Filter & Pencarian</h3>
          <button @click="clearFilters" class="clear-filters-btn">
            <i class="fas fa-times"></i>
            Clear Filters
          </button>
        </div>
        <div class="filters-grid">
          <div class="filter-group">
            <label>Cari Partner:</label>
            <input 
              v-model="filters.partner" 
              type="text" 
              placeholder="Nama partner..."
              @input="debounceFilter"
              class="filter-input"
            >
          </div>
          <div class="filter-group">
            <label>Service Type:</label>
            <select v-model="filters.service_type" @change="applyFilters" class="filter-select">
              <option value="">Semua Service</option>
              <option v-for="service in uniqueServices" :key="service" :value="service">
                {{ getServiceLabel(service) }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>Kategori:</label>
            <select v-model="filters.category" @change="applyFilters" class="filter-select">
              <option value="">Semua Kategori</option>
              <option value="aeronautika">Aeronautika</option>
              <option value="non-aeronautika">Non-Aeronautika</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Sort by:</label>
            <select v-model="filters.sort" @change="applyFilters" class="filter-select">
              <option value="date">Tanggal</option>
              <option value="amount">Jumlah</option>
              <option value="partner">Partner</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="table-section">
        <div class="table-header">
          <h3>Detail Transaksi ({{ detailData.transactions.length }})</h3>
        </div>
        <div class="table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Partner</th>
                <th>Kategori</th>
                <th>Service Type</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
                          <tr v-for="transaction in detailData.transactions" :key="transaction.id" class="transaction-row">
                <td class="date-cell">{{ formatDate(transaction.date) }}</td>
                <td class="partner-cell">{{ transaction.partner }}</td>
                <td class="category-cell">
                  <span class="category-badge" :class="transaction.category">
                    {{ transaction.category === 'aeronautika' ? 'Aeronautika' : 'Non-Aeronautika' }}
                  </span>
                </td>
                <td class="service-cell">{{ getServiceLabel(transaction.service_type) }}</td>
                <td class="amount-cell">{{ formatCurrency(transaction.amount) }}</td>
                <td class="status-cell">
                  <span class="status-badge" :class="transaction.payment_status">
                    {{ getStatusLabel(transaction.payment_status) }}
                  </span>
                </td>
                <td class="invoice-cell">{{ transaction.invoice_number || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <i class="fas fa-chart-bar"></i>
      <h3>Tidak ada data</h3>
      <p>Tidak ada transaksi untuk periode yang dipilih</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRevenueStore } from '../stores/revenue'
import PartnerChart from '../components/PartnerChart.vue'
import ServiceChart from '../components/ServiceChart.vue'
import * as XLSX from 'xlsx'

export default {
  name: 'MonthlyDetail',
  components: {
    PartnerChart,
    ServiceChart
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const revenueStore = useRevenueStore()

    const selectedYear = ref(parseInt(route.query.year) || new Date().getFullYear())
    const selectedMonth = ref(parseInt(route.query.month) || new Date().getMonth() + 1)
    const loading = ref(false)
    
    const filters = ref({
      partner: '',
      service_type: '',
      category: '',
      sort: 'date'
    })

    const years = ref([2020, 2021, 2022, 2023, 2024, 2025])
    const months = ref([
      { value: 1, label: 'Januari' },
      { value: 2, label: 'Februari' },
      { value: 3, label: 'Maret' },
      { value: 4, label: 'April' },
      { value: 5, label: 'Mei' },
      { value: 6, label: 'Juni' },
      { value: 7, label: 'Juli' },
      { value: 8, label: 'Agustus' },
      { value: 9, label: 'September' },
      { value: 10, label: 'Oktober' },
      { value: 11, label: 'November' },
      { value: 12, label: 'Desember' }
    ])

    const detailData = computed(() => revenueStore.monthlyDetailData)

    const uniqueServices = computed(() => {
      if (!detailData.value) return []
      const services = new Set(detailData.value.transactions.map(t => t.service_type))
      return Array.from(services)
    })

    // Methods
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }

    const getServiceLabel = (serviceType) => {
      const serviceLabels = {
        'pjp2u': 'PJP2U',
        'pjp4u': 'PJP4U',
        'garbarata': 'Garbarata',
        'checkin_counter': 'Check-in Counter',
        'jpkp2u': 'JPKP2U',
        'sewa_ruang': 'Sewa Ruang',
        'sewa_lahan': 'Sewa Lahan',
        'listrik': 'Listrik',
        'konsesi_tenant': 'Konsesi Tenant',
        'konsesi_parkir_reguler': 'Parkir Reguler',
        'konsesi_parkir_inap': 'Parkir Inap',
        'fuel_throughput': 'Fuel Throughput',
        'konsesi_iklan': 'Iklan',
        'pas_bandara': 'Pas Bandara',
        'ground_handling': 'Ground Handling'
      }
      return serviceLabels[serviceType] || serviceType
    }

    const getStatusLabel = (status) => {
      const statusLabels = {
        'paid': 'Lunas',
        'pending': 'Pending',
        'overdue': 'Terlambat'
      }
      return statusLabels[status] || status
    }

    const loadData = async () => {
      loading.value = true
      try {
        await revenueStore.fetchMonthlyDetail(selectedYear.value, selectedMonth.value, filters.value)
        
        // Update URL without triggering navigation
        router.replace({
          query: {
            year: selectedYear.value,
            month: selectedMonth.value
          }
        })
      } finally {
        loading.value = false
      }
    }

    const goBack = () => {
      router.push('/')
    }

    const changeMonth = () => {
      loadData()
    }

    const previousMonth = () => {
      if (selectedMonth.value === 1) {
        selectedMonth.value = 12
        selectedYear.value--
      } else {
        selectedMonth.value--
      }
      loadData()
    }

    const nextMonth = () => {
      if (selectedMonth.value === 12) {
        selectedMonth.value = 1
        selectedYear.value++
      } else {
        selectedMonth.value++
      }
      loadData()
    }

    const clearFilters = () => {
      filters.value = {
        partner: '',
        service_type: '',
        category: '',
        sort: 'date'
      }
      loadData()
    }

    const applyFilters = () => {
      loadData()
    }

    let debounceTimeout = null
    const debounceFilter = () => {
      clearTimeout(debounceTimeout)
      debounceTimeout = setTimeout(() => {
        applyFilters()
      }, 500)
    }

    const exportToExcel = () => {
      if (!detailData.value) return

      const data = detailData.value.transactions.map(transaction => ({
        'Tanggal': formatDate(transaction.date),
        'Partner': transaction.partner,
        'Kategori': transaction.category === 'aeronautika' ? 'Aeronautika' : 'Non-Aeronautika',
        'Service Type': getServiceLabel(transaction.service_type),
        'Jumlah': transaction.amount,
        'Status': getStatusLabel(transaction.payment_status),
        'Invoice': transaction.invoice_number || '-',
        'Metode Pembayaran': transaction.payment_method || '-',
        'Deskripsi': transaction.description || '-'
      }))

      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Detail Transaksi')

      const fileName = `Detail_Pendapatan_${detailData.value.period.monthName}_${detailData.value.period.year}.xlsx`
      XLSX.writeFile(workbook, fileName)
    }

    onMounted(() => {
      loadData()
    })

    return {
      selectedYear,
      selectedMonth,
      loading,
      filters,
      years,
      months,
      detailData,
      uniqueServices,
      formatCurrency,
      formatDate,
      getServiceLabel,
      getStatusLabel,
      loadData,
      goBack,
      changeMonth,
      previousMonth,
      nextMonth,
      clearFilters,
      applyFilters,
      debounceFilter,
      exportToExcel
    }
  }
}
</script>

<style scoped>
.monthly-detail {
  min-height: 100vh;
  background: #f8fafc;
}

.detail-header {
  background: linear-gradient(135deg, #6b46c1 0%, #3b82f6 50%, #8b5cf6 100%);
  color: white;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  flex-wrap: wrap;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: translateY(-2px);
}

.header-title h1 {
  font-size: 24px;
  font-weight: 900;
  color: #fbbf24;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.header-title p {
  font-size: 14px;
  font-weight: 600;
  color: #fbbf24;
  margin: 5px 0 0 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.month-navigator {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255,255,255,0.1);
  padding: 8px;
  border-radius: 10px;
}

.nav-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.3);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.month-select, .year-select {
  background: rgba(255,255,255,0.9);
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.export-btn {
  background: rgba(16, 185, 129, 0.9);
  border: none;
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-btn:hover:not(:disabled) {
  background: rgba(16, 185, 129, 1);
  transform: translateY(-2px);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 15px;
  color: #6b7280;
  font-size: 18px;
}

.loading-container i {
  font-size: 48px;
}

.detail-content {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.summary-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.summary-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.3s ease;
}

.summary-card:hover {
  transform: translateY(-3px);
}

.summary-card.total {
  border-left: 4px solid #10b981;
}

.summary-card.aeronautika {
  border-left: 4px solid #3b82f6;
}

.summary-card.non-aeronautika {
  border-left: 4px solid #8b5cf6;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.summary-card.total .card-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.summary-card.aeronautika .card-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.summary-card.non-aeronautika .card-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}

.card-content h3 {
  margin: 0 0 8px 0;
  color: #6b7280;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
}

.amount {
  margin: 0 0 5px 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 700;
}

.count {
  color: #9ca3af;
  font-size: 12px;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
}

.chart-container {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.chart-container h3 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
}

.filters-section {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
}

.clear-filters-btn {
  background: #f3f4f6;
  border: none;
  color: #6b7280;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.clear-filters-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.filter-input, .filter-select {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.filter-input:focus, .filter-select:focus {
  outline: none;
  border-color: #6b46c1;
  box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
}

.table-section {
  background: white;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  overflow: hidden;
}

.table-header {
  padding: 25px 25px 0 25px;
}

.table-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
}

.table-container {
  overflow-x: auto;
  margin-top: 20px;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
}

.transactions-table th {
  background: #f8fafc;
  padding: 15px 12px;
  text-align: left;
  font-weight: 700;
  color: #374151;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e5e7eb;
}

.transactions-table td {
  padding: 15px 12px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
}

.transaction-row:hover {
  background: #f8fafc;
}

.date-cell {
  font-weight: 600;
  color: #6b7280;
}

.partner-cell {
  font-weight: 600;
  color: #1f2937;
}

.category-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.category-badge.aeronautika {
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
}

.category-badge.non-aeronautika {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
}

.service-cell {
  color: #374151;
}

.amount-cell {
  font-weight: 700;
  color: #059669;
  text-align: right;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.paid {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-badge.pending {
  background: rgba(251, 191, 36, 0.1);
  color: #d97706;
}

.status-badge.overdue {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.invoice-cell {
  color: #6b7280;
  font-family: monospace;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 15px;
  color: #6b7280;
}

.empty-state i {
  font-size: 64px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .month-navigator {
    flex-wrap: wrap;
  }

  .detail-content {
    padding: 20px;
    gap: 20px;
  }

  .summary-section {
    grid-template-columns: 1fr;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .transactions-table {
    font-size: 12px;
  }

  .transactions-table th,
  .transactions-table td {
    padding: 10px 8px;
  }
}
</style>