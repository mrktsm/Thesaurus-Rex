import { useEffect, useRef, useState } from "react";
import { faVolumeUp } from "@fortawesome/free-solid-svg-icons";
import { faBookmark as faSolidBookmark } from "@fortawesome/free-solid-svg-icons";
import { faBookmark as faRegularBookmark } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Bookmark {
  word: string;
  partOfSpeech: string;
  phonetic: string;
}

const Modal = () => {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const url = "https://api.dictionaryapi.dev/api/v2/entries/en/";
  const handleSearch = async () => {
    try {
      const response = await fetch(`${url}${selectedText}`);
      const data = await response.json();
      if (response.ok) {
        setResult(data[0]);
        setError("");
      } else {
        setResult(null);
        setError("Couldn't Find The Word");
      }
    } catch {
      setResult(null);
      setError("Couldn't Find The Word");
    }
  };

  const playSound = () => {
    if (result && result.phonetics && result.phonetics[0]?.audio) {
      const audio = new Audio(result.phonetics[0].audio);
      audio.play();
    }
  };

  useEffect(() => {
    const sendSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        window.parent.postMessage(
          {
            type: "resize",
            width: rect.width,
            height: rect.height,
          },
          "*"
        );
      }
    };

    // Send size on mount
    sendSize();

    // Send size whenever content changes
    const observer = new ResizeObserver(sendSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [result, error]); // Re-run when content changes

  useEffect(() => {
    // Get the URL parameters
    const params = new URLSearchParams(window.location.search);

    // Extract the 'text' parameter and decode it
    const text = params.get("text");
    if (text) {
      setSelectedText(decodeURIComponent(text));
    }
  }, []);

  useEffect(() => {
    if (selectedText) {
      handleSearch();
    }
  }, [selectedText]); // Run when selectedText is set

  useEffect(() => {
    chrome.storage.local.get(["playSoundEnabled"], (result) => {
      if (result.playSoundEnabled) {
        playSound();
      }
    });
  }, [result]); // Run when result changes

  useEffect(() => {
    // Check if the selected word is already bookmarked
    if (selectedText) {
      chrome.storage.local.get(["bookmarkedWords"], (result) => {
        const currentBookmarks: Bookmark[] = result.bookmarkedWords || [];
        setIsBookmarked(
          currentBookmarks.some((bookmark) => bookmark.word === selectedText)
        );
      });
    }
  }, [selectedText]); // Run whenever selectedText changes

  const toggleBookmark = () => {
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);

    chrome.storage.local.get(["bookmarkedWords"], (storageResult) => {
      const currentBookmarks: Bookmark[] = storageResult.bookmarkedWords || [];
      let updatedBookmarks;

      if (newBookmarkState) {
        // Safely extract properties from the API result
        const partOfSpeech = result?.meanings?.[0]?.partOfSpeech || "Unknown";
        const phonetic = result?.phonetic || "Unknown";

        const newBookmark: Bookmark = {
          word: selectedText,
          partOfSpeech,
          phonetic,
        };
        updatedBookmarks = [newBookmark, ...currentBookmarks];
      } else {
        updatedBookmarks = currentBookmarks.filter(
          (bookmark) => bookmark.word !== selectedText
        );
      }

      chrome.storage.local.set({ bookmarkedWords: updatedBookmarks });
    });
  };

  return (
    <div
      ref={containerRef}
      className="bg-blue-50 w-96 max-w-lg p-8 text-center rounded border-2 border-blue-900"
    >
      <div id="result" className="relative">
        {error && <h3 className="text-center text-red-500">{error}</h3>}
        {result && (
          <div className="mt-0">
            <div className="flex justify-between">
              <div className="flex items-center">
                <button
                  onClick={playSound}
                  className="text-blue-900 bg-blue-50 size-12 flex items-center justify-center space-x-2 border-none focus:outline-none"
                  style={{ marginLeft: "-8px" }}
                >
                  <FontAwesomeIcon icon={faVolumeUp} className="text-lg" />
                </button>
                <h3 className="text-2xl text-gray-800">{selectedText}</h3>
              </div>
              <button
                onClick={toggleBookmark}
                className="text-blue-900 bg-blue-50 size-12 flex items-center justify-center space-x-2 border-none focus:outline-none"
              >
                <FontAwesomeIcon
                  icon={isBookmarked ? faSolidBookmark : faRegularBookmark}
                  className="text-lg"
                />
              </button>
            </div>
            <div className="details flex gap-2 text-gray-500 mt-3 ">
              <p>{result.meanings[0]?.partOfSpeech}</p>
              <p>{result.phonetic}</p>
            </div>
            <p className="word-meaning mt-2 text-gray-600 text-left">
              {result.meanings[0]?.definitions[0]?.definition}
            </p>
            {result.meanings[0]?.definitions[0]?.example && (
              <p className="word-example italic border-l-4 border-blue-900 pl-4 mt-4 text-gray-600 text-left">
                {result.meanings[0]?.definitions[0]?.example}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
