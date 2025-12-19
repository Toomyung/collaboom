import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  DollarSign,
  Package,
  CheckCircle,
  Upload,
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
  Sparkles,
} from "lucide-react";
import { SiTiktok, SiAmazon } from "react-icons/si";
import { MainLayout } from "@/components/layout/MainLayout";

interface ProcessStep {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function HorizontalProcess({ steps, color }: { steps: ProcessStep[]; color: string }) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-100 dark:bg-purple-900/50 text-purple-600",
    emerald: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600",
    amber: "bg-amber-100 dark:bg-amber-900/50 text-amber-600",
  };
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorMap[color]}`}>
              <step.icon className="h-5 w-5" />
            </div>
            <span className="text-xs text-muted-foreground text-center max-w-[60px] leading-tight">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}

interface BenefitItem {
  text: string;
}

interface RequirementItem {
  text: string;
  link?: { url: string; label: string };
  highlight?: boolean;
}

function ContentGrid({ 
  benefits, 
  requirements, 
  color 
}: { 
  benefits: BenefitItem[]; 
  requirements: RequirementItem[];
  color: string;
}) {
  const colorMap: Record<string, { check: string; arrow: string }> = {
    purple: { check: "text-purple-500", arrow: "text-purple-500" },
    emerald: { check: "text-emerald-500", arrow: "text-emerald-500" },
    amber: { check: "text-amber-500", arrow: "text-amber-500" },
  };
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="p-4 rounded-lg border bg-card">
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
          <CheckCircle className={`h-4 w-4 ${colorMap[color].check}`} />
          What You Get
        </h4>
        <ul className="space-y-2 text-sm">
          {benefits.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle className={`h-4 w-4 mt-0.5 shrink-0 ${colorMap[color].check}`} />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 rounded-lg border bg-card">
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
          <Star className={`h-4 w-4 ${colorMap[color].check}`} />
          Requirements
        </h4>
        <ul className="space-y-2 text-sm">
          {requirements.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              {item.highlight ? (
                <CreditCard className={`h-4 w-4 mt-0.5 shrink-0 ${colorMap[color].arrow}`} />
              ) : (
                <ArrowRight className="h-3 w-3 mt-1.5 text-muted-foreground shrink-0" />
              )}
              <span>
                {item.text}
                {item.link && (
                  <a 
                    href={item.link.url}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`ml-1 ${colorMap[color].arrow} hover:underline inline-flex items-center gap-0.5`}
                  >
                    {item.link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlatformBadge({ color, children }: { color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
  };
  
  return (
    <div className={`mt-6 p-4 rounded-lg border ${colorMap[color]}`}>
      <p className="text-sm flex items-start gap-2">
        {children}
      </p>
    </div>
  );
}

export default function CampaignTypesPage() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
            className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 hover-elevate cursor-pointer transition-all"
            data-testid="button-nav-gifting"
          >
            <Gift className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="font-bold text-purple-700 dark:text-purple-300">Gifting</p>
            <p className="text-sm text-muted-foreground">Free Products</p>
          </button>
          <button 
            onClick={() => document.getElementById('section-link-in-bio')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-center p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 hover-elevate cursor-pointer transition-all"
            data-testid="button-nav-link-in-bio"
          >
            <ExternalLink className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
            <p className="font-bold text-emerald-700 dark:text-emerald-300">Link in Bio</p>
            <Badge className="bg-emerald-500 text-white mt-1">+$30</Badge>
          </button>
          <button 
            onClick={() => document.getElementById('section-amazon-video')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-center p-6 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 hover-elevate cursor-pointer transition-all"
            data-testid="button-nav-amazon-store"
          >
            <Store className="h-8 w-8 mx-auto mb-2 text-amber-600" />
            <p className="font-bold text-amber-700 dark:text-amber-300">Amazon Video</p>
            <Badge className="bg-amber-500 text-white mt-1">+$30</Badge>
          </button>
        </div>

        {/* Campaign Type 1: Gifting */}
        <section id="section-gifting" className="mb-10 scroll-mt-20">
          <Card className="border-2 border-purple-300 dark:border-purple-700 overflow-hidden" data-testid="card-campaign-gifting">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 text-white w-fit">
                  <Gift className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-2xl text-purple-700 dark:text-purple-300">Gifting Campaign</CardTitle>
                    <Badge variant="outline" className="border-purple-500 text-purple-600">Most Popular</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Receive free products in exchange for TikTok content
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Reward</p>
                  <p className="text-2xl font-bold text-purple-600">Free Product</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  How It Works
                </h4>
                <HorizontalProcess 
                  color="purple"
                  steps={[
                    { icon: CheckCircle, label: "Apply" },
                    { icon: Package, label: "Receive" },
                    { icon: Video, label: "Create" },
                    { icon: Upload, label: "Upload" },
                    { icon: Star, label: "Done" },
                  ]} 
                />
              </div>
              
              <ContentGrid
                color="purple"
                benefits={[
                  { text: "Free K-Beauty, Food, or Lifestyle products" },
                  { text: "Build your portfolio with brand collaborations" },
                  { text: "Earn points toward VIP status" },
                ]}
                requirements={[
                  { text: "TikTok account with 1,000+ followers" },
                  { text: "US-based shipping address" },
                  { text: "Post video within deadline" },
                ]}
              />

              <PlatformBadge color="purple">
                <SiTiktok className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong>Platform:</strong> Post your video on TikTok and share the link with us</span>
              </PlatformBadge>
            </CardContent>
          </Card>
        </section>

        {/* Campaign Type 2: Link in Bio */}
        <section id="section-link-in-bio" className="mb-10 scroll-mt-20">
          <Card className="border-2 border-emerald-300 dark:border-emerald-700 overflow-hidden" data-testid="card-campaign-link-in-bio">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white w-fit">
                  <ExternalLink className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-2xl text-emerald-700 dark:text-emerald-300">Link in Bio</CardTitle>
                    <Badge className="bg-emerald-500 text-white">Paid Campaign</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Add a purchase link to your bio + create TikTok content for $30
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Reward</p>
                  <p className="text-3xl font-bold text-emerald-600">$30</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500" />
                  How It Works
                </h4>
                <HorizontalProcess 
                  color="emerald"
                  steps={[
                    { icon: CheckCircle, label: "Apply" },
                    { icon: Package, label: "Receive" },
                    { icon: ExternalLink, label: "Add Link" },
                    { icon: Video, label: "Create" },
                    { icon: Upload, label: "Upload" },
                    { icon: DollarSign, label: "Earn $30" },
                  ]} 
                />
              </div>

              <ContentGrid
                color="emerald"
                benefits={[
                  { text: "Free product from brand" },
                  { text: "Earn $30 cash reward" },
                  { text: "Help your followers find the product" },
                ]}
                requirements={[
                  { text: "Add product purchase link to your TikTok bio (Linktree, Beacons, etc.)" },
                  { text: "Submit your bio link for verification" },
                  { text: "Upload TikTok video with required hashtags" },
                  { text: "PayPal account required for payment", highlight: true, link: { url: "https://www.paypal.com/us/webapps/mpp/account-selection", label: "Sign up" } },
                ]}
              />

              <PlatformBadge color="emerald">
                <SiTiktok className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong>Platform:</strong> TikTok video + Bio link verification required</span>
              </PlatformBadge>
            </CardContent>
          </Card>
        </section>

        {/* Campaign Type 3: Amazon Video Upload */}
        <section id="section-amazon-video" className="mb-10 scroll-mt-20">
          <Card className="border-2 border-amber-300 dark:border-amber-700 overflow-hidden" data-testid="card-campaign-amazon-store">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white w-fit">
                  <Store className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-2xl text-amber-700 dark:text-amber-300">Amazon Video Upload</CardTitle>
                    <Badge className="bg-amber-500 text-white">Paid Campaign</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Post on TikTok + Amazon Storefront for maximum earnings
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Reward</p>
                  <p className="text-3xl font-bold text-amber-600">$30</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  How It Works
                </h4>
                <HorizontalProcess 
                  color="amber"
                  steps={[
                    { icon: CheckCircle, label: "Apply" },
                    { icon: Package, label: "Receive" },
                    { icon: Video, label: "Create" },
                    { icon: SiTiktok, label: "Post TikTok" },
                    { icon: SiAmazon, label: "Post Amazon" },
                    { icon: DollarSign, label: "Earn $30" },
                  ]} 
                />
              </div>

              <ContentGrid
                color="amber"
                benefits={[
                  { text: "Free product from brand" },
                  { text: "Earn $30 cash reward" },
                  { text: "Build your Amazon Storefront presence" },
                ]}
                requirements={[
                  { text: "Active Amazon Influencer Storefront", link: { url: "https://affiliate-program.amazon.com/influencers", label: "Join Program" } },
                  { text: "Post video on TikTok AND Amazon Storefront" },
                  { text: "Submit both links for verification" },
                  { text: "PayPal account required for payment", highlight: true, link: { url: "https://www.paypal.com/us/webapps/mpp/account-selection", label: "Sign up" } },
                ]}
              />

              <PlatformBadge color="amber">
                <Trophy className="h-4 w-4 mt-0.5 shrink-0" />
                <span><strong>Pro Tip:</strong> Perfect for influencers who already have an Amazon Storefront. Dual platform posting maximizes your reach!</span>
              </PlatformBadge>
            </CardContent>
          </Card>
        </section>

        {/* Bonus Section: Usage Rights */}
        <section className="mb-12">
          <Card className="border-2 border-rose-300 dark:border-rose-700 overflow-hidden bg-gradient-to-br from-rose-50/50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/20" data-testid="card-campaign-usage-rights">
            <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white w-fit">
                  <Heart className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CardTitle className="text-2xl text-rose-700 dark:text-rose-300">Usage Rights Bonus</CardTitle>
                    <Badge className="bg-rose-500 text-white">Optional Add-on</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Earn extra when brands want to use your content for marketing
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Bonus</p>
                  <p className="text-3xl font-bold text-rose-600">+$30</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-rose-500" />
                  How It Works
                </h4>
                <HorizontalProcess 
                  color="purple"
                  steps={[
                    { icon: Video, label: "You Create" },
                    { icon: Heart, label: "Brand Loves It" },
                    { icon: Star, label: "They Ask" },
                    { icon: DollarSign, label: "+$30 Bonus" },
                  ]} 
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-rose-500" />
                    What You Get
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-500" />
                      <span>Extra $30 on top of campaign reward</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-500" />
                      <span>Your content featured in brand marketing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-500" />
                      <span>Available for any campaign type</span>
                    </li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-rose-500" />
                    Where Brands Use Your Video
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Landing Pages</Badge>
                    <Badge variant="secondary">Social Media Ads</Badge>
                    <Badge variant="secondary">Website</Badge>
                    <Badge variant="secondary">Email Marketing</Badge>
                    <Badge variant="secondary">Product Pages</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <p className="text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <Star className="h-4 w-4 mt-0.5 shrink-0" />
                  <span><strong>Note:</strong> This bonus is available for <strong>any campaign type</strong>. If a brand chooses to purchase usage rights to your video, you'll receive an additional $30 on top of your regular campaign reward.</span>
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
                    <th className="text-center py-3 px-4 font-semibold text-purple-600">
                      <Gift className="h-4 w-4 mx-auto mb-1" />
                      Gifting
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-emerald-600">
                      <ExternalLink className="h-4 w-4 mx-auto mb-1" />
                      Link in Bio
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-amber-600">
                      <Store className="h-4 w-4 mx-auto mb-1" />
                      Amazon Video
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className="py-3 px-4">Cash Reward</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4 font-semibold text-emerald-600">$30</td>
                    <td className="text-center py-3 px-4 font-semibold text-amber-600">$30</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Free Product</td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Bio Link Required</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">TikTok Post</td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4">Amazon Storefront</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-center py-3 px-4"><CheckCircle className="h-4 w-4 mx-auto text-green-500" /></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Usage Rights Bonus</td>
                    <td className="text-center py-3 px-4 text-rose-600">+$30</td>
                    <td className="text-center py-3 px-4 text-rose-600">+$30</td>
                    <td className="text-center py-3 px-4 text-rose-600">+$30</td>
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
      </div>
    </MainLayout>
  );
}
