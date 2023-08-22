import axios from "axios";
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from "react-redux";
import { Link, useParams } from 'react-router-dom';
import { deleteBookCommentThunk } from "../../services/auth-thunks.js";
import "./BookComments.css";
import { Alert } from 'react-bootstrap';

const SERVER_API_URL = process.env.REACT_APP_SERVER_API_URL;
const BOOKS_DETAILS_URL = `${SERVER_API_URL}/books/details`;
const BOOKS_URL = `${SERVER_API_URL}/books`;
const BOOK_LIKES_URL = `${SERVER_API_URL}/books/like`;
const api = axios.create({ withCredentials: true });

const BookComments = () => {

    const { currentUser } = useSelector((state) => state.user);
    const { searchContent, id } = useParams();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState([]);
    const [error, setError] = useState(null);
    const [timeAgo, setTimeAgo] = useState('');
    const [refreshComments, setRefreshComments] = useState(false);
    const dispatch = useDispatch();

    const fetchCommentsFromDatabase = async () => {
        try {
            const response = await fetch(`${BOOKS_DETAILS_URL}/${id}`);
            console.log("Response from adding comment:", response.data);
            if (response.ok) {
                const commentsAndLikesData = await response.json();
                console.log("Comments and Likes data:", commentsAndLikesData);
                const currentTime = new Date(); // Current time
                const commentsAndLikesData_time = commentsAndLikesData.comments.map(comment => ({
                    ...comment,
                    timeAgo: getTimeAgo(currentTime, new Date(comment.commentTime))
                }));
                setComments(commentsAndLikesData_time);
                setLikes(commentsAndLikesData.likes);
            } else {
                console.error('Failed to fetch comments and likes');
            }
        } catch (error) {
            console.error('Error fetching comments and likes:', error);
        }
    }

    const getTimeAgo = (currentTime, commentTime) => {
        const timeDifference = currentTime - commentTime;
        const minutesDifference = Math.floor(timeDifference / (1000 * 60));
        if (minutesDifference < 1) {
            return ('Just now');
        } else if (minutesDifference < 60) {
            return (`${minutesDifference} minutes ago`);
        } else {
            return (`${Math.floor(minutesDifference / 60)} hours ago`);
        }
    }

    useEffect(() => {
        fetchCommentsFromDatabase();
    }, [id, refreshComments]);

    const handleLikeClick = async () => {
        if (liked) {
            return;
        }
        try {
            const response = await api.put(`${BOOK_LIKES_URL}/${id}`, currentUser);
            console.log(response);
            if (response.ok) {
                setLikes([...likes, { id: likes.length + 1 }]);
            }
            setLiked(!liked);
        } catch (error) {
            if (error.response.status === 404) {
                error.message = "Please login to add a like";
            }
            setError(error);
        }
    };

    const handleSubmit = async (e) => {
        console.log("handleSubmit is triggered");
        e.preventDefault();
        if (newComment.trim() !== '') {
            const body = {
                user: currentUser,
                comment: newComment
            }
            try {
                const response = await api.post(`${BOOKS_URL}/${id}`, body);
                if (response.ok && response.data) {
                    const newCommentFromServer = response.data.comment; 
                    setComments(prevComments => {
                        const updatedComments = [...prevComments, newCommentFromServer];
                        console.log("Updated comments:", updatedComments);
                        return updatedComments;
                    });
                    setNewComment('');
                }
                setRefreshComments(!refreshComments);
            } catch (error) {
                console.error("Error in handleSubmit:", error);
                if (error.response.status === 404) {
                    error.message = "Please login to add a comment";
                }
                setError(error);
            }
        }
    };

  const deleteComment = async (bid, cid) => {
      console.log("Triggered deleteComment");
      try {
        const result = await dispatch(deleteBookCommentThunk({ bookId: bid, commentId: cid, userId: currentUser._id }));
        console.log("Result of delete operation:", result);
        // Update the comments list immediately after successful deletion
        console.log("Before updating comments state");
        setComments(prevComments => prevComments.filter(comment => comment._id !== cid));
        console.log("After updating comments state");
      } catch (error) {
        console.error("Error deleting comment:", error);
      }
  }
  
  return (
    <div className="book-comments">
      <div className="row">
      {error && <Alert variant="danger">{error.message}</Alert>}
        <span className="col-7"><h3>Like this book?</h3></span>
        <span className="col-3">
          <i className="bi bi-heart" 
            style={{color: liked ? "red" : ""}}
            onClick={handleLikeClick}></i>
				<span className="col-2">{liked ? likes.length + 1: likes.length}</span>
			</span>
      </div>
      
      
      <p id="likes-list">{likes.map((like, index) => (index > 0 ? ' ' : ''))}</p>
      <h3>Comments</h3>
      <form onSubmit={handleSubmit} className="comment-form">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Enter your comment..."
        />
        <button type="submit">Submit</button>
      </form>
      <ul className="comment-list">
      {comments.map((comment) => (
      <li key={comment._id} className="comment-item position-relative">
        {currentUser && (currentUser.isAdmin || currentUser.isContentAdmin) && (
          <span 
            className="comment-delete-icon text-danger" 
            onClick={() => deleteComment(id, comment._id)}
          >
            &times;
          </span>
        )}
        <div className="comment-header">
          <Link to={`/users/profile/${comment.user._id}`}>
              <img src={comment.user.avatarUrl} alt={`${comment.user.username}'s Avatar`} />
          </Link>
          <div className="user-info">
              <div className="username-time">
                  <Link className="comment-username" to={`/users/profile/${comment.user._id}`}>
                      {comment.user && comment.user.username ? comment.user.username : 'Anonymous'}
                  </Link>
                  <span className="comment-time"> • {comment.timeAgo}</span>
              </div>
              <div className="row">
                  <span className="col 9"><p className="comment-text">{comment.content}</p></span> 
              </div>
          </div>
        </div>
      </li>
    ))}
      </ul>
      <form onSubmit={handleSubmit} className="comment-form">
      </form>
    </div>
  );

}

export default BookComments;
