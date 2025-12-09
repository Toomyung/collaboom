import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ArrowLeft,
  Gift,
  DollarSign,
  ShoppingCart,
  Camera,
  Package,
  CheckCircle,
  Upload,
  FileImage,
  CreditCard,
  Store,
  Video,
  Star,
  ArrowRight,
  Zap,
  Trophy,
  ExternalLink,
  Heart,
  ChevronRight,
} from "lucide-react";
import { SiTiktok, SiAmazon } from "react-icons/si";

function StepIndicator({ number, isLast = false }: { number: number; isLast?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
        {number}
      </div>
      {!isLast && (
        <div className="w-0.5 h-8 bg-border mt-1" />
      )}
    </div>
  );
}

function ProcessStep({ 
  step, 
  icon: Icon, 
  title, 
  description, 
  isLast = false 
}: { 
  step: number; 
  icon: typeof Gift; 
  title: string; 
  description?: string; 
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <StepIndicator number={step} isLast={isLast} />
      <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-medium">{title}</span>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

function HorizontalProcess({ steps }: { steps: { icon: React.ComponentType<{ className?: string }>; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <step.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground text-center max-w-[60px]">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CampaignTypesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl" data-testid="link-campaign-types-home">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Collaboom
              </span>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">Types of Campaigns</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
            Collaboom is a growth platform designed for <strong className="text-foreground">Nano Influencers</strong> (1,000 - 10,000 followers) 
            who are ready to take their creator journey to the next level.
          </p>
          <div className="bg-muted/50 rounded-lg p-6 max-w-3xl mx-auto text-left">
            <p className="text-muted-foreground leading-relaxed">
              Through ongoing collaborations with diverse brands, we help influencers build lasting partnerships. 
              Brands get authentic storytelling from passionate creators, while influencers start with gifting campaigns 
              and grow into long-term <strong className="text-foreground">brand ambassadors</strong>. It's a win-win platform 
              where both sides thrive together.
            </p>
          </div>
        </div>

        {/* Quick Overview Cards - Clickable Navigation */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <button 
            onClick={() => document.getElementById('section-gifting')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 hover-elevate cursor-pointer transition-all"
            data-testid="button-nav-gifting"
          >
            <Gift className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="font-bold text-green-700 dark:text-green-300">Gifting</p>
            <p className="text-sm text-muted-foreground">Free Products</p>
          </button>
          <button 
            onClick={() => document.getElementById('section-cost-covered')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 hover-elevate cursor-pointer transition-all"
            data-testid="button-nav-cost-covered"
          >
            <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="font-bold text-blue-700 dark:text-blue-300">Cost Covered</p>
            <Badge className="bg-blue-500 text-white mt-1">+$30</Badge>
          </button>
          <button 
            onClick={() => document.getElementById('section-amazon-store')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border border-purple-200 dark:border-purple-800 hover-elevate cursor-pointer transition-all"
            data-testid="button-nav-amazon-store"
          >
            <Store className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="font-bold text-purple-700 dark:text-purple-300">Amazon Store</p>
            <Badge className="bg-purple-500 text-white mt-1">+$50</Badge>
          </button>
        </div>

        {/* Campaign Type 1: Gifting */}
        <section id="section-gifting" className="mb-10 scroll-mt-20">
          <Card className="border-2 border-green-300 dark:border-green-700 overflow-hidden" data-testid="card-campaign-gifting">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white w-fit">
                  <Gift className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-2xl text-green-700 dark:text-green-300">Gifting Campaign</CardTitle>
                    <Badge variant="outline" className="border-green-500 text-green-600">Most Popular</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Receive free products in exchange for TikTok content
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Reward</p>
                  <p className="text-2xl font-bold text-green-600">Free Product</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    How It Works
                  </h4>
                  <HorizontalProcess steps={[
                    { icon: CheckCircle, label: "Apply" },
                    { icon: Package, label: "Receive" },
                    { icon: Video, label: "Create" },
                    { icon: Upload, label: "Upload" },
                    { icon: Star, label: "Done" },
                  ]} />
                </div>
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-500" />
                    What You Get
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <span>Free K-Beauty, Food, or Lifestyle products</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <span>Build your portfolio with brand collaborations</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <span>Earn points toward VIP status</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                  <SiTiktok className="h-4 w-4 mt-0.5 shrink-0" />
                  <span><strong>Platform:</strong> Post your video on TikTok and share the link with us</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Campaign Type 2: Product Cost Covered */}
        <section id="section-cost-covered" className="mb-10 scroll-mt-20">
          <Card className="border-2 border-blue-300 dark:border-blue-700 overflow-hidden" data-testid="card-campaign-cost-covered">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white w-fit">
                  <ShoppingCart className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-2xl text-blue-700 dark:text-blue-300">Product Cost Covered</CardTitle>
                    <Badge className="bg-blue-500 text-white">Paid Campaign</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Buy on Amazon, get reimbursed, plus earn $30 reward
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Reward</p>
                  <p className="text-3xl font-bold text-blue-600">$30</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Step-by-Step Process
                </h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-2">
                      <SiAmazon className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium">1. Buy on Amazon</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-2">
                      <FileImage className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium">2. Screenshot Order</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-2">
                      <Upload className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium">3. Submit Proof</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-2">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium">4. Get Reimbursed</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-2">
                      <Video className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium">5. Create & Upload</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center mb-2">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">6. Earn $30</span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Key Benefits
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1.5 text-blue-500 shrink-0" />
                      <span>No upfront cost (fully reimbursed)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1.5 text-blue-500 shrink-0" />
                      <span>Keep the product + earn $30</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1.5 text-blue-500 shrink-0" />
                      <span>Quick reimbursement after verification</span>
                    </li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4 text-blue-500" />
                    Requirements
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1.5 text-muted-foreground shrink-0" />
                      <span>Amazon account required</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1.5 text-muted-foreground shrink-0" />
                      <span>Clear purchase screenshot</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="h-3 w-3 mt-1.5 text-muted-foreground shrink-0" />
                      <span>TikTok video upload</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Campaign Type 3: Amazon Video Upload */}
        <section id="section-amazon-store" className="mb-10 scroll-mt-20">
          <Card className="border-2 border-purple-300 dark:border-purple-700 overflow-hidden" data-testid="card-campaign-amazon-store">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 text-white w-fit">
                  <Store className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-2xl text-purple-700 dark:text-purple-300">Amazon Video Upload</CardTitle>
                    <Badge className="bg-purple-500 text-white">Premium Paid</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Post on TikTok + Amazon Storefront for maximum earnings
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Reward</p>
                  <p className="text-3xl font-bold text-purple-600">$50</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  How It Works
                </h4>
                <HorizontalProcess steps={[
                  { icon: CheckCircle, label: "Apply" },
                  { icon: Package, label: "Receive" },
                  { icon: Video, label: "Create" },
                  { icon: SiTiktok, label: "Post TikTok" },
                  { icon: SiAmazon, label: "Post Amazon" },
                  { icon: DollarSign, label: "Earn $50" },
                ]} />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Store className="h-4 w-4" />
                    Amazon Storefront Required
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    You must have an active Amazon Influencer Storefront to participate in this campaign type.
                  </p>
                  <a 
                    href="https://affiliate-program.amazon.com/influencers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:underline flex items-center gap-1"
                    data-testid="link-amazon-influencer-program"
                  >
                    Learn about Amazon Influencer Program
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Video className="h-4 w-4 text-purple-500" />
                    Dual Platform Posting
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <SiTiktok className="h-5 w-5" />
                      <span className="text-sm">TikTok Video</span>
                      <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <SiAmazon className="h-5 w-5" />
                      <span className="text-sm">Amazon Storefront</span>
                      <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-950/50 dark:to-violet-950/50 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-300 flex items-start gap-2">
                  <Trophy className="h-4 w-4 mt-0.5 shrink-0" />
                  <span><strong>Pro Tip:</strong> This is similar to Gifting but with higher rewards! Perfect for influencers who already have an Amazon Storefront.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Bonus Section: Usage Rights */}
        <section className="mb-12">
          <Card className="border-2 border-amber-300 dark:border-amber-700 overflow-hidden bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20" data-testid="card-campaign-usage-rights">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-white w-fit">
                  <Heart className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-2xl text-amber-700 dark:text-amber-300">Usage Rights Bonus</CardTitle>
                    <Badge className="bg-amber-500 text-white">Optional Add-on</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Earn extra when brands want to use your content
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Bonus</p>
                  <p className="text-3xl font-bold text-amber-600">+$50</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3">
                    <Video className="h-8 w-8 text-amber-600" />
                  </div>
                  <h4 className="font-semibold mb-1">Your Content</h4>
                  <p className="text-sm text-muted-foreground">You create amazing video content for the brand</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3">
                    <Heart className="h-8 w-8 text-amber-600" />
                  </div>
                  <h4 className="font-semibold mb-1">Brand Loves It</h4>
                  <p className="text-sm text-muted-foreground">Brand wants to use your video for their marketing</p>
                </div>
                <div className="text-center p-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-3">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-1">Extra $50</h4>
                  <p className="text-sm text-muted-foreground">You receive additional payment for usage rights</p>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg border bg-card">
                <h4 className="font-semibold mb-3 text-amber-700 dark:text-amber-300">Where Brands Can Use Your Video</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Landing Pages</Badge>
                  <Badge variant="secondary">Social Media Ads</Badge>
                  <Badge variant="secondary">Website</Badge>
                  <Badge variant="secondary">Email Marketing</Badge>
                  <Badge variant="secondary">Product Pages</Badge>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <Star className="h-4 w-4 inline mr-2" />
                  <strong>Note:</strong> This bonus is available for <strong>any campaign type</strong>. If a brand chooses to purchase usage rights to your video, you'll receive an additional $50 on top of your regular campaign reward.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Comparison Table */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Quick Comparison</h2>
          <Card data-testid="card-comparison-table">
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Feature</th>
                    <th className="text-center py-3 px-4 font-semibold text-green-600">
                      <Gift className="h-4 w-4 mx-auto mb-1" />
                      Gifting
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-blue-600">
                      <ShoppingCart className="h-4 w-4 mx-auto mb-1" />
                      Cost Covered
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-600">
                      <Store className="h-4 w-4 mx-auto mb-1" />
                      Amazon Store
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-3 px-4">Cash Reward</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4 font-semibold text-blue-600">$30</td>
                    <td className="text-center py-3 px-4 font-semibold text-purple-600">$50</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Free Product</td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Amazon Account</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4">Storefront</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">TikTok Post</td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Amazon Post</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Usage Rights Bonus</td>
                    <td className="text-center py-3 px-4 text-amber-600">+$50</td>
                    <td className="text-center py-3 px-4 text-amber-600">+$50</td>
                    <td className="text-center py-3 px-4 text-amber-600">+$50</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20" data-testid="card-cta">
            <CardContent className="py-10">
              <h2 className="text-2xl font-bold mb-4">Ready to Start?</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Browse available campaigns and find the perfect match for your content style.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/">
                  <Button size="lg" data-testid="button-browse-campaigns">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Browse Campaigns
                  </Button>
                </Link>
                <Link href="/score-tier">
                  <Button variant="outline" size="lg" data-testid="button-learn-tiers">
                    Learn About Tiers
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
