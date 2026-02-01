export type HeroContent = {
  title: string
  subtitle?: string
  backgroundImage?: string
  cta?: { label: string; url: string }
}

const heroContent: HeroContent = {
  title: "Welcome to SiteName",
  subtitle: "Shop the best products",
  backgroundImage: "/uploads/hero-default.jpg",
  cta: { label: "Shop Now", url: "/shop" },
}

export default heroContent
