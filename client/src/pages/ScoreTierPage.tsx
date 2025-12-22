import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  Crown,
  User,
  UserPlus,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Gift,
  MessageSquare,
  Mail,
  ShoppingBag,
  Award,
  Target,
  Rocket,
  Shield,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MainLayout } from "@/components/layout/MainLayout";

export default function ScoreTierPage() {
  const { influencer, isAuthenticated, isAdmin, isLoading } = useAuth();
  const isInfluencer = isAuthenticated && !isAdmin;

  const currentScore = influencer?.score ?? 0;
  const completedCampaigns = influencer?.completedCampaigns ?? 0;

  function getTierInfo(score: number, completed: number) {
    // Tier definitions:
    // - Starting: completedCampaigns === 0 OR score < 50
    // - Standard: completedCampaigns >= 1 AND score >= 50 AND score < 85
    // - VIP: completedCampaigns >= 1 AND score >= 85
    if (completed === 0 || score < 50) {
      return {
        name: "Starting Influencer",
        color: "from-slate-400 to-gray-500",
        bgColor: "bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30",
        borderColor: "border-slate-300 dark:border-slate-700",
        textColor: "text-slate-700 dark:text-slate-300",
        icon: UserPlus,
        nextTier: completed === 0 ? "Standard (complete 1 campaign)" : "Standard",
        pointsToNext: completed === 0 ? null : 50 - score,
      };
    } else if (score >= 85) {
      return {
        name: "VIP Influencer",
        color: "from-amber-400 to-yellow-500",
        bgColor: "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30",
        borderColor: "border-amber-300 dark:border-amber-700",
        textColor: "text-amber-700 dark:text-amber-300",
        icon: Crown,
        nextTier: null,
        pointsToNext: null,
      };
    } else {
      return {
        name: "Standard Influencer",
        color: "from-blue-400 to-indigo-500",
        bgColor: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30",
        borderColor: "border-blue-300 dark:border-blue-700",
        textColor: "text-blue-700 dark:text-blue-300",
        icon: User,
        nextTier: "VIP",
        pointsToNext: 85 - score,
      };
    }
  }

  const tierInfo = getTierInfo(currentScore, completedCampaigns);
  const TierIcon = tierInfo.icon;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isInfluencer && influencer && !isLoading && (
          <Card className={`mb-12 ${tierInfo.bgColor} ${tierInfo.borderColor} border-2`} data-testid="card-current-score">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full bg-gradient-to-r ${tierInfo.color} text-white`}>
                    <TierIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Current Status</p>
                    <h2 className={`text-2xl font-bold ${tierInfo.textColor}`}>{tierInfo.name}</h2>
                  </div>
                </div>
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl font-bold">{currentScore}</span>
                    <span className="text-muted-foreground">/ 100 points</span>
                  </div>
                  <Progress value={currentScore} className="h-3" />
                  {tierInfo.nextTier && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      {tierInfo.pointsToNext} more points to reach {tierInfo.nextTier}
                    </p>
                  )}
                  {!tierInfo.nextTier && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">
                      <Crown className="h-4 w-4 inline mr-1" />
                      You've reached the highest tier!
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Score & Tier System</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Build your reputation on Collaboom by completing campaigns successfully. Higher scores unlock exclusive benefits and opportunities.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Influencer Tiers
          </h2>

          <Card className="mb-6 border-2 border-primary/30 bg-primary/5" data-testid="card-tier-unlock-info">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary text-white shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">How to Unlock Tier Benefits</h3>
                  <p className="text-muted-foreground">
                    Even if you start with 60 points after signing up and adding your address, <strong className="text-foreground">you must complete at least one campaign successfully</strong> to unlock Standard Influencer benefits.
                  </p>
                  <p className="text-muted-foreground">
                    Until your first campaign is completed, you remain a <strong className="text-foreground">Starting Influencer</strong> — meaning you can only work on one campaign at a time. Once you successfully finish your first campaign, all Standard tier perks become available!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid gap-6">
            <Card className="border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20" data-testid="card-tier-vip">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-white">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-amber-700 dark:text-amber-300">VIP Influencer</CardTitle>
                    <CardDescription>85 points or higher</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0">
                    Elite Status
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Rocket className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <span><strong>Paid Collaboration Early Access</strong> — Access paid campaigns 24 hours before others on an exclusive page</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <span><strong>One-Click Auto-Approval</strong> — No brand approval needed. Apply instantly to any campaign</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <span><strong>Unlimited Applications</strong> — Apply to as many campaigns as you want with no daily limits</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <span><strong>Priority Team Support</strong> — Get faster responses and dedicated assistance from our team</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20" data-testid="card-tier-standard">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-blue-700 dark:text-blue-300">Standard Influencer</CardTitle>
                    <CardDescription>50+ points AND at least 1 completed campaign</CardDescription>
                  </div>
                  <Badge className="ml-auto bg-gradient-to-r from-blue-400 to-indigo-500 text-white border-0">
                    Active Creator
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-sm">
                  <CheckCircle className="h-4 w-4 inline mr-2 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-300">
                    <strong>Unlock Requirement:</strong> Complete your first campaign successfully to access these benefits
                  </span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Gift className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <span><strong>3 Daily Applications</strong> — Apply to up to 3 campaigns per day</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <span><strong>Full Campaign Access</strong> — Access all paid campaigns on Collaboom (Basic, Link in Bio, Amazon Video)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <span><strong>Personal Dashboard</strong> — Manage your campaigns and track progress in one place</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <span><strong>Forum Support</strong> — Communicate with our support team through the dashboard</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <span><strong>Email Notifications</strong> — Stay updated on campaign statuses and important updates</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-300 dark:border-slate-700 bg-gradient-to-r from-slate-50/50 to-gray-50/50 dark:from-slate-950/20 dark:to-gray-950/20" data-testid="card-tier-starting">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-r from-slate-400 to-gray-500 text-white">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-700 dark:text-slate-300">Starting Influencer</CardTitle>
                    <CardDescription>All new creators until first campaign is completed</CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    Getting Started
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 text-sm">
                  <Clock className="h-4 w-4 inline mr-2 text-slate-600 dark:text-slate-400" />
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>Note:</strong> Even with 60 points, you stay in this tier until you successfully complete your first campaign
                  </span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                    <span><strong>One Campaign at a Time</strong> — You cannot apply to other campaigns until you complete your current one</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                    <span><strong>Trial Dashboard</strong> — Experience the dashboard features as you work on your first campaign</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
                    <span><strong>Email Notifications</strong> — Receive important updates about your campaign</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <Rocket className="h-4 w-4 inline mr-2" />
                    <strong>Level Up:</strong> Complete your first campaign successfully to unlock Standard Influencer benefits and apply to 3 campaigns per day!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Point System
          </h2>

          <Card className="mb-6" data-testid="card-point-structure">
            <CardHeader>
              <CardTitle className="text-lg">How Points Work</CardTitle>
              <CardDescription>
                Collaboom uses a point system based on multiples of 5 with simple addition and subtraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="p-2 rounded-full bg-green-500 text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-300">Starting Points</p>
                  <p className="text-sm text-muted-foreground">
                    <strong>+50 points</strong> automatically on signup + <strong>+10 points</strong> when you add your address = Start at <strong>60 points</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="p-2 rounded-full bg-amber-500 text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-300">Important Warning</p>
                  <p className="text-sm text-muted-foreground">
                    If your score drops <strong>below 50 points</strong>, your account will be suspended
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card data-testid="card-earn-points">
              <CardHeader className="bg-green-50 dark:bg-green-950/30 rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                  <TrendingUp className="h-5 w-5" />
                  Ways to Earn Points
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Badge className="bg-green-500 text-white shrink-0">+50</Badge>
                    <div>
                      <p className="font-medium">Sign up to Collaboom</p>
                      <p className="text-sm text-muted-foreground">Automatic welcome bonus</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-green-500 text-white shrink-0">+10</Badge>
                    <div>
                      <p className="font-medium">Complete your address</p>
                      <p className="text-sm text-muted-foreground">Add your shipping address</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-green-500 text-white shrink-0">+3</Badge>
                    <div>
                      <p className="font-medium">Upload video on time</p>
                      <p className="text-sm text-muted-foreground">Meet the deadline</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-green-500 text-white shrink-0">+5</Badge>
                    <div>
                      <p className="font-medium">Quality content bonus</p>
                      <p className="text-sm text-muted-foreground">Upload exceptional content</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge className="bg-green-500 text-white shrink-0">+10</Badge>
                    <div>
                      <p className="font-medium">Brand repurchase</p>
                      <p className="text-sm text-muted-foreground">Brand orders more from you</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card data-testid="card-lose-points">
              <CardHeader className="bg-red-50 dark:bg-red-950/30 rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                  <TrendingDown className="h-5 w-5" />
                  Ways to Lose Points
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Badge variant="destructive" className="shrink-0">-3</Badge>
                    <div>
                      <p className="font-medium">24 hours past deadline</p>
                      <p className="text-sm text-muted-foreground">Late by one day</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Badge variant="destructive" className="shrink-0">-10</Badge>
                    <div>
                      <p className="font-medium">48 hours past deadline</p>
                      <p className="text-sm text-muted-foreground">Severely late or no-show</p>
                    </div>
                  </li>
                </ul>

                <div className="mt-6 p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    <strong>Note:</strong> Points are manually managed by admins except for signup and address bonuses. Always communicate with our team if you're facing issues meeting deadlines.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mb-12">
          <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20" data-testid="card-example-scenario">
            <CardHeader>
              <CardTitle className="text-lg">Example Scenario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    50
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Sign up to Collaboom</p>
                    <p className="text-sm text-muted-foreground">+50 points welcome bonus</p>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-muted-foreground/30 h-6 ml-6" />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold">
                    60
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Add shipping address</p>
                    <p className="text-sm text-muted-foreground">+10 points address bonus</p>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-muted-foreground/30 h-6 ml-6" />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-bold">
                    65
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Complete first campaign with quality content</p>
                    <p className="text-sm text-muted-foreground">+5 points for great work</p>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-muted-foreground/30 h-6 ml-6" />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold">
                    85
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">After 4 successful campaigns</p>
                    <p className="text-sm text-muted-foreground">Welcome to VIP status!</p>
                  </div>
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="text-center">
          {!isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Ready to start earning points?</p>
              <Link href="/register">
                <Button size="lg" data-testid="button-get-started">
                  Get Started
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : isInfluencer ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Keep completing campaigns to earn more points!</p>
              <Link href="/campaigns">
                <Button size="lg" data-testid="button-browse-campaigns">
                  Browse Campaigns
                  <Gift className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </MainLayout>
  );
}
