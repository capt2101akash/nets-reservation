import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  Stack, Chip, Divider
} from '@mui/material';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SecurityIcon from '@mui/icons-material/Security';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: <CalendarMonthIcon sx={{ fontSize: 36 }} />, title: 'Easy Booking', desc: 'Pick your date and time in seconds with our intuitive slot calendar.' },
  { icon: <AccessTimeIcon sx={{ fontSize: 36 }} />, title: 'Flexible Hours', desc: 'Available 8:30 AM – 10:30 PM, every day. Book up to 3 months ahead.' },
  { icon: <PrecisionManufacturingIcon sx={{ fontSize: 36 }} />, title: 'Bowling Machine', desc: 'Add a bowling machine to sharpen your game for just $50/hr.' },
  { icon: <SecurityIcon sx={{ fontSize: 36 }} />, title: 'Free Cancellation', desc: 'Cancel any booking up to 24 hours before your session, no questions asked.' },
];

const pricingPlans = [
  {
    title: 'Nets Only',
    price: '$30',
    unit: '/ hour',
    color: 'primary',
    features: ['Full cricket net access', 'Bring your own gear', 'Book 30-min increments', 'Up to 3 months advance'],
    cta: 'Book Nets Only',
  },
  {
    title: 'Nets + Bowling Machine',
    price: '$50',
    unit: '/ hour',
    color: 'secondary',
    popular: true,
    features: ['Full cricket net access', 'Professional bowling machine', 'Adjustable speed & line', 'Book 30-min increments', 'Up to 3 months advance'],
    cta: 'Book with Machine',
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <Box>
      {/* Hero (1st Section) */}
      <Box sx={{
        minHeight: '92vh', display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
        bgcolor: '#0d1117'
      }}>
        {/* Background Video */}
        <Box
          component="video"
          autoPlay
          muted
          loop
          playsInline
          src="/media/video-5.mp4"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.45
          }}
        />

        {/* Backdrop Overlay Mask for Typography Legibility */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, rgba(13,17,23,0.5) 0%, rgba(13,17,23,0.95) 100%), radial-gradient(circle at 30% 30%, rgba(46,125,50,0.2) 0%, transparent 60%)',
          zIndex: 1,
          pointerEvents: 'none'
        }} />

        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400,
          borderRadius: '50%', border: '1px solid rgba(46,125,50,0.1)', pointerEvents: 'none', zIndex: 2 }} />
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260,
          borderRadius: '50%', border: '1px solid rgba(46,125,50,0.05)', pointerEvents: 'none', zIndex: 2 }} />

        <Container maxWidth="lg" sx={{ py: 8, position: 'relative', zIndex: 3 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                <Chip 
                  label="Now Open · Book Online" 
                  color="primary" 
                  sx={{ mb: 3, fontWeight: 600, fontSize: '0.9rem', px: 1, letterSpacing: 0.5 }} 
                />
                <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '3.8rem' }, lineHeight: 1.3, mb: 3, fontWeight: 800 }}>
                  Train Smarter at{' '}
                  <Box component="span" sx={{ background: 'linear-gradient(90deg, #4caf50, #ffb300)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Northridge Nets
                  </Box>
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 4, fontWeight: 400, maxWidth: 520, lineHeight: 1.6 }}>
                  Professional cricket nets in the heart of Northridge. Book your slot online in under 60 seconds — with or without our precision bowling machine.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {user ? (
                    <Button component={RouterLink} to="/book" variant="contained" color="primary" size="large"
                      startIcon={<CalendarMonthIcon />} sx={{ px: 4, py: 1.5, fontSize: '1.05rem' }}>
                      Book a Session
                    </Button>
                  ) : (
                    <>
                      <Button component={RouterLink} to="/register" variant="contained" color="primary" size="large"
                        startIcon={<SportsCricketIcon />} sx={{ px: 4, py: 1.5, fontSize: '1.05rem' }}>
                        Get Started Free
                      </Button>
                      <Button component={RouterLink} to="/login" variant="outlined" size="large"
                        sx={{ 
                          px: 4, py: 1.5, fontSize: '1.05rem',
                          color: '#ffffff',
                          borderColor: 'rgba(255, 255, 255, 0.4)',
                          '&:hover': {
                            borderColor: '#ffffff',
                            bgcolor: 'rgba(255, 255, 255, 0.08)'
                          }
                        }}>
                        Sign In
                      </Button>
                    </>
                  )}
                </Stack>

                <Stack direction="row" spacing={3} mt={5} flexWrap="wrap" useFlexGap gap={2}>
                  {['8:30 AM – 10:30 PM', '30-min slots', 'Cancel anytime'].map(text => (
                    <Stack key={text} direction="row" alignItems="center" spacing={1}>
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'primary.light' }} />
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>{text}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </motion.div>
            </Grid>

            <Grid item xs={12} md={5}>
              <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, rgba(46,125,50,0.15) 0%, rgba(245,127,23,0.08) 100%)',
                  border: '1px solid rgba(46,125,50,0.3)', borderRadius: 4, p: 4, textAlign: 'center'
                }}>
                  <SportsCricketIcon sx={{ fontSize: 80, color: 'primary.light', mb: 2 }} />
                  <Typography variant="h5" fontWeight={700} mb={2} sx={{ lineHeight: 1.3 }}>Premium Cricket Nets</Typography>
                  <Typography color="text.secondary" mb={3} sx={{ lineHeight: 1.5 }}>State-of-the-art facility with professional-grade netting and optional high-speed bowling machine.</Typography>
                  <Stack spacing={1.5}>
                    {['Full-length 22-yard net', 'LED-lit for evening sessions', 'Ample parking', 'Changing facilities nearby'].map(f => (
                      <Stack key={f} direction="row" alignItems="center" spacing={1.5}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: 'primary.light' }} />
                        <Typography variant="body2" sx={{ lineHeight: 1.4 }}>{f}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pricing (2nd Section) */}
      <Box sx={{ py: 12, background: 'radial-gradient(ellipse at center, rgba(46,125,50,0.07) 0%, transparent 70%)' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography variant="overline" color="primary" letterSpacing={2} fontWeight={600}>Transparent Pricing</Typography>
            <Typography variant="h3" fontWeight={800} mt={1.5}>Choose Your Session</Typography>
          </Box>
          <Grid container spacing={4} justifyContent="center">
            {pricingPlans.map((plan, i) => (
              <Grid item xs={12} sm={6} md={5} key={plan.title}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  style={{ height: '100%', display: 'flex' }}>
                  <Card sx={{
                    height: '100%', position: 'relative', overflow: 'visible',
                    display: 'flex', flexDirection: 'column', width: '100%',
                    border: plan.popular ? '2px solid' : '1px solid',
                    borderColor: plan.popular ? 'secondary.main' : 'divider',
                    '&:hover': { transform: 'translateY(-4px)', transition: 'all 0.2s' },
                  }}>
                    {plan.popular && (
                      <Chip label="Most Popular" color="secondary" size="small"
                        sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontWeight: 700, zIndex: 1 }} />
                    )}
                    <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <Typography variant="h5" fontWeight={700} sx={{ minHeight: 64, lineHeight: 1.3 }} mb={1}>{plan.title}</Typography>
                      <Box display="flex" alignItems="baseline" mb={3}>
                        <Typography variant="h2" fontWeight={800} color={`${plan.color}.main`}>{plan.price}</Typography>
                        <Typography variant="h6" color="text.secondary" ml={1}>{plan.unit}</Typography>
                      </Box>
                      <Stack spacing={2} mb={5}>
                        {plan.features.map(f => (
                          <Stack key={f} direction="row" alignItems="flex-start" spacing={1.5}>
                            <CheckCircleIcon sx={{ fontSize: 18, color: `${plan.color}.light`, mt: 0.2 }} />
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{f}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                      <Box sx={{ mt: 'auto' }}>
                        <Button
                          fullWidth variant="contained" color={plan.color} size="large"
                          component={RouterLink} to={user ? '/book' : '/register'}
                        >
                          {plan.cta}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Our Facility Video Gallery */}
      <Box sx={{ py: 12, bgcolor: '#0b0f15' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography variant="overline" color="primary" letterSpacing={2} fontWeight={600}>Inside The Facility</Typography>
            <Typography variant="h3" fontWeight={800} mt={1.5}>Our Training Environment</Typography>
            <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 600, mx: 'auto' }}>
              Explore our state-of-the-art batting lanes, professional bowling machines, and fully illuminated nets. Hover to preview each lane!
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center">
            {[
              { src: '/media/video-1.mp4', title: 'Main Net Lane', desc: 'Full length 22-yard turf pitch with premium safety netting.' },
              { src: '/media/video-2.mp4', title: 'Bowling Machine Lane', desc: 'Sleek bowling machine alleys designed for repetitive batting drills.' },
              { src: '/media/video-3.mp4', title: 'Batting Practice Area', desc: 'Equipped with multiple speed options and automated ball feeder.' },
              { src: '/media/video-4.mp4', title: 'Evening Training', desc: 'LED illuminated lanes for late evening sessions.' },
              { src: '/media/video-6.mp4', title: 'Coaching Arena', desc: 'Perfect for professional coaching sessions and team practice.' }
            ].map((video, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{ height: '100%', display: 'flex' }}
                >
                  <Card sx={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-6px)',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
                      transition: 'all 0.3s ease'
                    }
                  }}>
                    <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden' }}>
                      <Box
                        component="video"
                        src={video.src}
                        muted
                        loop
                        playsInline
                        controls
                        onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                        onMouseLeave={(e) => { e.currentTarget.pause(); }}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </Box>
                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight={700} mb={1}>{video.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, mt: 'auto' }}>
                        {video.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features (3rd Section) */}
      <Box sx={{ bgcolor: 'background.paper', py: 12 }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography variant="overline" color="primary" letterSpacing={2} fontWeight={600}>Why Choose Us</Typography>
            <Typography variant="h3" fontWeight={800} mt={1.5}>Everything You Need</Typography>
          </Box>
          <Grid container spacing={4}>
            {features.map((f, i) => (
              <Grid item xs={12} sm={6} md={3} key={f.title}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  style={{ height: '100%', display: 'flex' }}>
                  <Card sx={{ 
                    height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
                    '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)', transition: 'all 0.2s' } 
                  }}>
                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <Box sx={{ color: 'primary.light', mb: 2 }}>{f.icon}</Box>
                      <Typography variant="h6" fontWeight={700} mb={1.5} sx={{ lineHeight: 1.3 }}>{f.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{f.desc}</Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', py: 4 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <SportsCricketIcon sx={{ color: 'primary.light' }} />
              <Typography fontWeight={700}>Northridge Nets</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              © {new Date().getFullYear()} Northridge Nets. All rights reserved.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Open 8:30 AM – 10:30 PM · 7 Days a Week
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
