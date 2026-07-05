'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AddProductButton from '@/components/products/AddProductButton'
import { FullCalendarEvent, mapToFullCalendarEvent } from '@/types/event'
import { getProducts } from '@/services/productService'
import { Product } from '@/types/product'
import { safeErrorMessage } from '@/lib/safe-error'
import { LanguageSelector } from '@/components/ui/language-selector'
import { AppFooter } from '@/components/ui/footer-app'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  User,
  Mail,
  Shield,
  LogOut,
  Calendar,
  Package,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { TimelineResponsive } from '@/components/timeline'

interface ApiError extends Error {
  response?: {
    status: number
    data?: {
      message?: string
    }
  }
}

export default function Dashboard() {
  const t = useTranslations()
  const locale = useLocale()
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [calendarEvents, setCalendarEvents] = useState<FullCalendarEvent[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      if (!user) return
      const productsData = await getProducts(user.id)
      setProducts(productsData)
      setCalendarEvents(
        productsData.flatMap((product) =>
          (product.events || []).map((event) =>
            mapToFullCalendarEvent(event, product.name, product.category.name, product.id),
          ),
        ),
      )
    } catch (error) {
      console.error('Erreur lors du chargement des données :', safeErrorMessage(error))
      if (
        error instanceof Error &&
        'response' in error &&
        typeof (error as ApiError).response === 'object' &&
        (error as ApiError).response?.status === 403
      ) {
        // NE PAS logger l'objet `user` brut (PII : email/username). Seul l'id
        // suffit à corréler un 403 côté observabilité.
        console.error("Détails de l'erreur 403:", { userId: user?.id })
      }
    } finally {
      setLoadingEvents(false)
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/login`)
    }
  }, [user, loading, router, locale])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, fetchData])

  const handleLogout = async () => {
    try {
      await logout()
      router.push(`/${locale}/login`)
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', safeErrorMessage(error))
    }
  }

  if (loading) {
    return (
      <div className="bg-bg flex h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="relative mx-auto h-16 w-16">
            <motion.div
              animate={{
                rotate: 360,
                transition: {
                  repeat: Infinity,
                  duration: 1.5,
                  ease: 'linear',
                },
              }}
              className="border-accent absolute inset-0 rounded-full border-t-2 border-b-2"
            />
            <div className="bg-bg absolute inset-3 flex items-center justify-center rounded-full">
              <CalendarDays className="text-accent h-6 w-6" />
            </div>
          </div>
          <p className="text-ink-muted mt-4 font-medium">{t('common.loading.default')}</p>
        </motion.div>
      </div>
    )
  }

  if (!user) return null

  const resources = products.map((product) => ({
    id: product.id,
    title: product.name,
    category: product.category.name,
  }))

  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="bg-bg text-ink flex min-h-screen flex-col" data-testid="dashboard">
      <header className="bg-surface sticky top-0 z-30 shadow-lg backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">
              <CalendarDays className="text-accent mr-2 h-6 w-6" />
              <h1 className="text-ink text-xl font-bold">{t('dashboard.title')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="text-ink hover:text-ink hover:bg-accent-soft flex items-center gap-2 rounded-lg transition-all duration-300"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('common.buttons.logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-surface overflow-hidden rounded-xl border-none shadow-xl backdrop-blur-sm">
            <CardHeader className="bg-surface flex flex-row items-center justify-between pb-6">
              <div className="flex items-center space-x-4">
                <div className="bg-accent-soft flex h-12 w-12 items-center justify-center rounded-full shadow-inner">
                  <User className="text-accent h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-ink flex items-center gap-2 text-xl font-bold">
                    {t('dashboard.welcome')}, {user.username}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: 0.3,
                      }}
                    >
                      <Zap className="text-accent h-5 w-5" />
                    </motion.div>
                  </h2>
                  <p className="text-ink-muted opacity-90">
                    {t('dashboard.lastConnection')}: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
              <AddProductButton onProductAdded={fetchData} />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="bg-surface-2 border-rule flex items-center space-x-3 rounded-lg border p-4">
                  <Mail className="text-accent h-5 w-5" />
                  <div>
                    <p className="text-ink-muted text-sm">{t('dashboard.email')}</p>
                    <p className="text-ink font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="bg-surface-2 border-rule flex items-center space-x-3 rounded-lg border p-4">
                  <Shield className="text-accent h-5 w-5" />
                  <div>
                    <p className="text-ink-muted text-sm">{t('dashboard.role')}</p>
                    <p className="text-ink font-medium">{user.role}</p>
                  </div>
                </div>
                <div className="bg-surface-2 border-rule flex items-center space-x-3 rounded-lg border p-4">
                  <Package className="text-accent h-5 w-5" />
                  <div>
                    <p className="text-ink-muted text-sm">{t('dashboard.products')}</p>
                    <p className="text-ink font-medium" data-testid="dashboard-products-count">
                      {products.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-surface overflow-hidden rounded-xl border-none shadow-xl backdrop-blur-sm">
            <CardHeader className="bg-surface pb-6">
              <div className="flex items-center space-x-3">
                <Calendar className="text-accent h-6 w-6" />
                <h2 className="text-ink text-xl font-bold">{t('dashboard.recentEvents.title')}</h2>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingEvents ? (
                <div className="bg-surface flex h-[500px] items-center justify-center backdrop-blur-sm">
                  <motion.div
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: 'linear',
                    }}
                  >
                    <RefreshCw className="text-accent h-8 w-8" />
                  </motion.div>
                  <p className="text-ink-muted ml-3">{t('common.loading.default')}</p>
                </div>
              ) : (
                <div className="bg-surface p-3">
                  {/* #55 desktop / #63 mobile portrait — `TimelineResponsive`
                      choisit la variante via `matchMedia` (max-width:640px). Desktop :
                      frise continue, zoom Cmd+molette, minimap, drawer, raccourcis.
                      Mobile : règle sticky, bottom sheet, action sheet, pinch-zoom. */}
                  <TimelineResponsive
                    events={calendarEvents}
                    resources={resources}
                    locale={locale}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  )
}
