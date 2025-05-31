import { FormEvent, useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { useVideoStore } from '../../stores/videoStore';
import { Database } from '../../lib/database.types';

type Video = Database['public']['Tables']['videos']['Row'];

interface UploadVideoFormProps {
  onClose: () => void;
  editVideo?: Video;
}

const UploadVideoForm = ({ onClose, editVideo }: UploadVideoFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { uploadVideo, updateVideo } = useVideoStore();

  useEffect(() => {
    if (editVideo) {
      setTitle(editVideo.title);
      setDescription(editVideo.description || '');
      setUrl(editVideo.url);
      setThumbnailUrl(editVideo.thumbnail_url || '');
    }
  }, [editVideo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!title || !url) {
      setError('Title and video URL are required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const videoData = {
        title,
        description,
        url,
        thumbnail_url: thumbnailUrl || undefined
      };

      let success;
      if (editVideo) {
        success = await updateVideo(editVideo.id, videoData);
      } else {
        success = await uploadVideo(videoData);
      }
      
      if (success) {
        onClose();
      } else {
        setError('Failed to upload video. You may not have admin privileges.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while uploading the video');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-lg  bg-gray-800 p-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <h2 className="text-xl font-semibold">{editVideo ? 'Edit Video' : 'Upload New Video'}</h2>
          <button
            className=" p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className=" bg-red-500/20 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-300">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full  border border-gray-700 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter video title"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full  border border-gray-700 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter video description"
              rows={3}
            />
          </div>
          
          <div>
            <label htmlFor="url" className="mb-1 block text-sm font-medium text-gray-300">
              Video URL *
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full  border border-gray-700 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter video URL"
              required
            />
            <p className="mt-1 text-xs text-gray-400">
              Enter the full URL to the video file (MP4, WebM, etc.)
            </p>
          </div>
          
          <div>
            <label htmlFor="thumbnailUrl" className="mb-1 block text-sm font-medium text-gray-300">
              Thumbnail URL
            </label>
            <input
              type="url"
              id="thumbnailUrl"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="w-full  border border-gray-700 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter thumbnail URL"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              className=" border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center  bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin  border-2 border-t-transparent"></div>
                  {editVideo ? 'Updating...' : 'Uploading...'}
                </span>
              ) : (
                <span className="flex items-center">
                  <Upload className="mr-2 h-4 w-4" />
                  {editVideo ? 'Update Video' : 'Upload Video'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadVideoForm;