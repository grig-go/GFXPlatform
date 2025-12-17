import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { NewsArticleWithOverrides } from "../types/news";
import { InlineEditField } from "./InlineEditField";
import { OverrideIndicator } from "./OverrideIndicator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { 
  ExternalLink, Clock, User, Globe, AlertTriangle, TrendingUp, 
  Heart, Share2, Eye, MessageCircle, Bookmark, MoreHorizontal,
  Zap, CheckCircle, ChevronRight, X, Calendar, Activity,
  FileText, Image as ImageIcon, Play, Volume2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface NewsCardProps {
  article: NewsArticleWithOverrides;
  onUpdate: (updatedArticle: NewsArticleWithOverrides) => void;
  onDelete?: (articleId: string) => void;
  compact?: boolean;
}

export function NewsCard({ article, onUpdate, onDelete, compact = false }: NewsCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showFullArticle, setShowFullArticle] = useState(false);

  const handleFieldUpdate = (field: string, value: any) => {
    const updatedArticle = {
      ...article,
      article: {
        ...article.article,
        [field]: value
      },
      lastModified: new Date().toISOString()
    };
    
    onUpdate(updatedArticle);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-3 h-3" />;
      case 'high': return <AlertTriangle className="w-3 h-3" />;
      case 'medium': return <AlertTriangle className="w-3 h-3" />;
      case 'low': return <AlertTriangle className="w-3 h-3" />;
      default: return null;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'ap_enps': return 'text-blue-600 bg-blue-50 dark:bg-blue-900';
      case 'newsapi': return 'text-green-600 bg-green-50 dark:bg-green-900';
      case 'newsdata': return 'text-purple-600 bg-purple-50 dark:bg-purple-900';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Play className="w-4 h-4" />;
      case 'audio': return <Volume2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const hasOverrides = article.overrides.length > 0;
  const hasMedia = article.article.media && article.article.media.length > 0;
  const featuredImage = hasMedia ? article.article.media.find(m => m.type === 'image') : null;

  // Article Preview Card
  const renderPreviewCard = () => (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] ${ 
        article.article.flags.is_breaking ? 'border-l-4 border-l-red-500' : ''
      } ${hasOverrides ? 'bg-amber-50 dark:bg-amber-950' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setShowFullArticle(true)}
    >
      <CardContent className="p-0">
        {/* Featured Image */}
        {featuredImage && (
          <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
            <ImageWithFallback
              src={featuredImage.url}
              alt={featuredImage.alt_text || article.article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {article.article.flags.is_breaking && (
                <Badge variant="destructive" className="gap-1">
                  <Zap className="w-3 h-3" />
                  BREAKING
                </Badge>
              )}
              {article.article.flags.is_live && (
                <Badge variant="default" className="gap-1 bg-red-600">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE
                </Badge>
              )}
            </div>
            <div className="absolute top-3 right-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getProviderColor(article.article.source.provider)}`}>
                {article.article.source.provider.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Header badges for articles without images */}
          {!featuredImage && (
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {article.article.flags.is_breaking && (
                  <Badge variant="destructive" className="gap-1">
                    <Zap className="w-3 h-3" />
                    BREAKING
                  </Badge>
                )}
                {article.article.flags.is_live && (
                  <Badge variant="default" className="gap-1 bg-red-600">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </Badge>
                )}
                {article.article.flags.severity && (
                  <Badge variant={getSeverityColor(article.article.flags.severity)} className="gap-1">
                    {getSeverityIcon(article.article.flags.severity)}
                    {article.article.flags.severity.toUpperCase()}
                  </Badge>
                )}
                {hasOverrides && <OverrideIndicator count={article.overrides.length} />}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getProviderColor(article.article.source.provider)}`}>
                {article.article.source.provider.toUpperCase()}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-semibold text-lg leading-tight line-clamp-2 hover:text-blue-600 transition-colors">
            {article.article.title}
          </h3>

          {/* Summary */}
          <p className="text-muted-foreground text-sm line-clamp-3">
            {article.article.summary}
          </p>

          {/* Article Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {article.article.source.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(article.article.published_at)}
              </span>
              {article.article.author && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {article.article.author}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasMedia && (
                <span className="flex items-center gap-1">
                  {getMediaIcon(article.article.media![0].type)}
                  {article.article.media!.length}
                </span>
              )}
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Tags Preview */}
          {article.article.taxonomy.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {article.article.taxonomy.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {article.article.taxonomy.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{article.article.taxonomy.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Full Article Modal
  const renderFullArticleModal = () => (
    <Dialog open={showFullArticle} onOpenChange={setShowFullArticle}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {article.article.flags.is_breaking && (
                  <Badge variant="destructive" className="gap-1">
                    <Zap className="w-3 h-3" />
                    BREAKING
                  </Badge>
                )}
                {article.article.flags.is_live && (
                  <Badge variant="default" className="gap-1 bg-red-600">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </Badge>
                )}
                {article.article.flags.severity && (
                  <Badge variant={getSeverityColor(article.article.flags.severity)} className="gap-1">
                    {getSeverityIcon(article.article.flags.severity)}
                    {article.article.flags.severity.toUpperCase()}
                  </Badge>
                )}
                {hasOverrides && <OverrideIndicator count={article.overrides.length} />}
                <span className={`px-2 py-1 rounded text-xs font-medium ${getProviderColor(article.article.source.provider)}`}>
                  {article.article.source.provider.toUpperCase()}
                </span>
              </div>
              
              <DialogTitle className="text-2xl font-bold leading-tight">
                <InlineEditField
                  value={article.article.title}
                  onSave={(value) => handleFieldUpdate('title', value)}
                  placeholder="Article title"
                  className="font-bold text-2xl leading-tight"
                  multiline={true}
                />
              </DialogTitle>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  {article.article.source.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatFullDate(article.article.published_at)}
                </span>
                {article.article.author && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {article.article.author}
                  </span>
                )}
                {article.article.metrics && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {article.article.metrics.reading_time_minutes}m read
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDelete(article.article.id)} className="text-destructive">
                      Delete Article
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <InlineEditField
              value={article.article.summary}
              onSave={(value) => handleFieldUpdate('summary', value)}
              placeholder="Article summary"
              className="text-muted-foreground"
              multiline={true}
            />
          </div>

          {/* Featured Media */}
          {hasMedia && (
            <div className="space-y-4">
              {article.article.media!.map((media, index) => (
                <div key={media.id} className="space-y-2">
                  {media.type === 'image' && (
                    <div className="relative w-full rounded-lg overflow-hidden">
                      <ImageWithFallback
                        src={media.url}
                        alt={media.alt_text || `Image ${index + 1}`}
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    </div>
                  )}
                  {media.caption && (
                    <p className="text-sm text-muted-foreground italic text-center">
                      {media.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Full Article Content */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {article.article.full_content ? (
              <div className="space-y-4">
                {article.article.full_content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Full article content not available.</p>
                <Button variant="outline" size="sm" asChild className="mt-4">
                  <a href={article.article.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Read on {article.article.source.name}
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Article Metadata */}
          <div className="border-t pt-4 space-y-4">
            {/* Categories and Topics */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium">Topics:</span>
                {article.article.taxonomy.topics.map((topic, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium">Tags:</span>
                {article.article.taxonomy.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Engagement Metrics */}
            {article.article.metrics && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {article.article.metrics.engagement_score}/100 engagement
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="w-4 h-4" />
                  {article.article.metrics.social_shares.toLocaleString()} shares
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {article.article.metrics.click_through_rate}% CTR
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={article.article.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Source Article
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="w-3 h-3" />
                Last updated: {formatTimeAgo(article.lastModified)}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {renderPreviewCard()}
      {renderFullArticleModal()}
    </>
  );
}