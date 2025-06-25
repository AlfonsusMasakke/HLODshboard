<template>
  <div class="data-entry">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/" class="back-btn">
          <i class="fas fa-arrow-left"></i>
          Kembali ke Dashboard
        </router-link>
        <h1>Input Data Pendapatan</h1>
        <p>Masukkan data pendapatan baru untuk sistem penagihan</p>
      </div>
    </div>

    <!-- Form Container -->
    <div class="form-container">
      <div class="form-card">
        <form @submit.prevent="handleSubmit" class="revenue-form">
          <!-- Basic Information -->
          <div class="form-section">
            <h3>Informasi Dasar</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="date">Tanggal</label>
                <input 
                  type="date" 
                  id="date" 
                  v-model="form.date" 
                  required 
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <!-- Partner Combobox -->
                <PartnerCombobox
                  v-model="form.partner_id"
                  :required="true"
                  @partner-selected="handlePartnerSelected"
                  @partner-created="handlePartnerCreated"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="category">Kategori Pendapatan</label>
                <select 
                  id="category" 
                  v-model="form.category" 
                  @change="updateServiceOptions"
                  required 
                  class="form-select"
                >
                  <option value="">Pilih Kategori</option>
                  <option value="aeronautika">Aeronautika</option>
                  <option value="non-aeronautika">Non-Aeronautika</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="service_type">Jenis Layanan</label>
                <select 
                  id="service_type" 
                  v-model="form.service_type" 
                  required 
                  class="form-select"
                  :disabled="!form.category"
                >
                  <option value="">Pilih Jenis Layanan</option>
                  <option 
                    v-for="service in serviceOptions" 
                    :key="service.value" 
                    :value="service.value"
                  >
                    {{ service.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Financial Information -->
          <div class="form-section">
            <h3>Informasi Keuangan</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="amount">Jumlah Pendapatan (Rupiah)</label>
                <div class="currency-input">
                  <span class="currency-symbol">Rp</span>
                  <input 
                    type="number" 
                    id="amount" 
                    v-model="form.amount" 
                    required 
                    class="form-input currency"
                    placeholder="0"
                    min="0"
                    step="1000"
                  >
                </div>
                <small class="form-hint">{{ formatCurrency(form.amount || 0) }}</small>
              </div>
              
              <div class="form-group">
                <label for="invoice_number">Nomor Invoice/Tagihan</label>
                <input 
                  type="text" 
                  id="invoice_number" 
                  v-model="form.invoice_number" 
                  class="form-input"
                  placeholder="INV-2024-001"
                >
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="payment_status">Status Pembayaran</label>
                <select 
                  id="payment_status" 
                  v-model="form.payment_status" 
                  required 
                  class="form-select"
                >
                  <option value="">Pilih Status</option>
                  <option value="paid">Lunas</option>
                  <option value="pending">Menunggu Pembayaran</option>
                  <option value="overdue">Terlambat</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="payment_method">Metode Pembayaran</label>
                <select 
                  id="payment_method" 
                  v-model="form.payment_method" 
                  class="form-select"
                >
                  <option value="">Pilih Metode</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="cash">Tunai</option>
                  <option value="check">Cek</option>
                  <option value="credit">Kredit</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="form-section">
            <div class="form-group">
              <label for="description">Deskripsi/Keterangan</label>
              <textarea 
                id="description" 
                v-model="form.description" 
                class="form-textarea"
                rows="4"
                placeholder="Masukkan deskripsi atau keterangan tambahan..."
              ></textarea>
            </div>
          </div>

          <!-- Submit Buttons -->
          <div class="form-actions">
            <button type="button" @click="resetForm" class="btn btn-secondary">
              Reset Form
            </button>
            <button type="submit" :disabled="loading" class="btn btn-primary">
              {{ loading ? 'Menyimpan...' : 'Simpan Data' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal-overlay" @click="closeSuccessModal">
      <div class="modal-content success-modal" @click.stop>
        <div class="modal-icon">
          <i class="fas fa-check-circle"></i>
        </div>
        <h3>Data Berhasil Disimpan!</h3>
        <p>Data pendapatan telah berhasil ditambahkan ke sistem.</p>
        <div class="modal-actions">
          <button @click="closeSuccessModal" class="btn btn-primary">
            OK
          </button>
          <button @click="addAnother" class="btn btn-secondary">
            Tambah Lagi
          </button>
        </div>
      </div>
    </div>

    <!-- Error Modal -->
    <div v-if="showErrorModal" class="modal-overlay" @click="closeErrorModal">
      <div class="modal-content error-modal" @click.stop>
        <div class="modal-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3>Terjadi Kesalahan!</h3>
        <p>{{ errorMessage }}</p>
        <div class="modal-actions">
          <button @click="closeErrorModal" class="btn btn-primary">
            OK
          </button>
        </div>
      </div>
    </div>

    <!-- Partner Success Toast -->
    <div v-if="showPartnerToast" class="toast success-toast">
      <i class="fas fa-check-circle"></i>
      <span>{{ partnerToastMessage }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRevenueStore } from '../stores/revenue'
import { usePartnerStore } from '../stores/partners'
import PartnerCombobox from '../components/PartnerCombobox.vue'

export default {
  name: 'DataEntry',
  components: {
    PartnerCombobox
  },
  setup() {
    const router = useRouter()
    const revenueStore = useRevenueStore()
    const partnerStore = usePartnerStore()
    
    // Form data - Updated with partner_id
    const form = ref({
      date: new Date().toISOString().split('T')[0],
      partner_id: null,
      category: '',
      service_type: '',
      amount: '',
      invoice_number: '',
      payment_status: '',
      payment_method: '',
      description: ''
    })
    
    // Loading and modal states
    const loading = ref(false)
    const showSuccessModal = ref(false)
    const showErrorModal = ref(false)
    const errorMessage = ref('')
    
    // Partner related states
    const selectedPartnerName = ref('')
    const showPartnerToast = ref(false)
    const partnerToastMessage = ref('')
    
    // Service options
    const aeronautikaServices = [
      { value: 'pjp2u', label: 'PJP2U' },
      { value: 'pjp4u', label: 'PJP4U' },
      { value: 'garbarata', label: 'Jasa pemakaian garbarata (aviobridge)' },
      { value: 'checkin_counter', label: 'Pemakaian check-in counter' },
      { value: 'jpkp2u', label: 'JPKP2U' }
    ]
    
      const nonAeronautikaServices = [
      { value: 'sewa_ruang', label: 'Sewa ruang/tempat' },
      { value: 'sewa_lahan', label: 'Sewa lahan' },
      { value: 'listrik', label: 'Pemakaian listrik (110%)' },
      { value: 'konsesi_tenant', label: 'Konsesi 5% dari tenant atas penjualan produk/jasa' },
      { value: 'konsesi_parkir_reguler', label: 'Konsesi 10% dari parkir reguler (roda 2 dan 4)' },
      { value: 'konsesi_parkir_inap', label: 'Konsesi 15% dari parkir inap (roda 4)' },
      { value: 'fuel_throughput', label: 'Fuel throughput' },
      { value: 'konsesi_iklan', label: 'Konsesi iklan' },
      { value: 'pas_bandara', label: 'Pembuatan pas bandara' },
      { value: 'ground_handling', label: 'Ground handling 15%' }
    ]
    
    // Computed properties
    const serviceOptions = computed(() => {
      if (form.value.category === 'aeronautika') {
        return aeronautikaServices
      } else if (form.value.category === 'non-aeronautika') {
        return nonAeronautikaServices
      }
      return []
    })
    
    // Methods
    const handlePartnerSelected = (partner) => {
      selectedPartnerName.value = partner.name
      console.log('Partner selected:', partner)
    }
    
    const handlePartnerCreated = (partner) => {
      selectedPartnerName.value = partner.name
      partnerToastMessage.value = `Mitra baru "${partner.name}" berhasil ditambahkan!`
      showPartnerToast.value = true
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        showPartnerToast.value = false
      }, 3000)
      
      console.log('New partner created:', partner)
    }
    
    const updateServiceOptions = () => {
      form.value.service_type = ''
    }
    
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount || 0)
    }
    
    const resetForm = () => {
      form.value = {
        date: new Date().toISOString().split('T')[0],
        partner_id: null,
        category: '',
        service_type: '',
        amount: '',
        invoice_number: '',
        payment_status: '',
        payment_method: '',
        description: ''
      }
      selectedPartnerName.value = ''
    }
    
    const handleSubmit = async () => {
      loading.value = true
      
      try {
        // Validation
        if (!form.value.date || !form.value.partner_id || !form.value.category || 
            !form.value.service_type || !form.value.amount || !form.value.payment_status) {
          throw new Error('Mohon lengkapi semua field yang wajib diisi')
        }
        
        const result = await revenueStore.addRevenueData(form.value)
        
        if (result.success) {
          showSuccessModal.value = true
          // Update partner statistics
          await partnerStore.fetchPartners()
        } else {
          errorMessage.value = result.message
          showErrorModal.value = true
        }
      } catch (error) {
        errorMessage.value = error.message
        showErrorModal.value = true
      } finally {
        loading.value = false
      }
    }
    
    const closeSuccessModal = () => {
      showSuccessModal.value = false
      router.push('/')
    }
    
    const addAnother = () => {
      showSuccessModal.value = false
      resetForm()
    }
    
    const closeErrorModal = () => {
      showErrorModal.value = false
    }
    
    return {
      form,
      loading,
      showSuccessModal,
      showErrorModal,
      errorMessage,
      selectedPartnerName,
      showPartnerToast,
      partnerToastMessage,
      serviceOptions,
      handlePartnerSelected,
      handlePartnerCreated,
      updateServiceOptions,
      formatCurrency,
      resetForm,
      handleSubmit,
      closeSuccessModal,
      addAnother,
      closeErrorModal
    }
  }
}
</script>

<style scoped>
.data-entry {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.page-header {
  background: linear-gradient(135deg, #6b46c1 0%, #3b82f6 50%, #8b5cf6 100%);
  color: white;
  padding: 40px 30px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 20px;
  transition: color 0.3s ease;
}

.back-btn:hover {
  color: white;
}

.page-header h1 {
  font-size: 36px;
  font-weight: 900;
  margin: 0 0 10px 0;
  color: #fbbf24;
}

.page-header p {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}

.form-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 30px;
}

.form-card {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.05);
}

.form-section {
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 2px solid #f1f5f9;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 30px;
}

.form-section h3 {
  color: #1e293b;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 25px 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-input, .form-select, .form-textarea {
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: #6b46c1;
  box-shadow: 0 0 0 3px rgba(107, 70, 193, 0.1);
}

.form-select:disabled {
  background-color: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.currency-input {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-symbol {
  position: absolute;
  left: 16px;
  color: #6b7280;
  font-weight: 600;
  z-index: 1;
}

.form-input.currency {
  padding-left: 40px;
}

.form-hint {
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 30px;
  border-top: 2px solid #f1f5f9;
}

.btn {
  padding: 14px 28px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #6b46c1 0%, #8b5cf6 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(107, 70, 193, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #f8fafc;
  color: #475569;
  border: 2px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.success-modal .modal-icon {
  color: #10b981;
}

.error-modal .modal-icon {
  color: #ef4444;
}

.modal-content h3 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 15px 0;
  color: #1f2937;
}

.modal-content p {
  color: #6b7280;
  font-size: 16px;
  margin: 0 0 30px 0;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.modal-actions .btn {
  min-width: 100px;
}

/* Toast Notification */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  animation: slideInRight 0.3s ease-out;
}

.success-toast {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  color: white;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 30px 20px;
  }

  .form-container {
    padding: 30px 20px;
  }

  .form-card {
    padding: 25px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .toast {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>