package com.example.graph.model;

import lombok.Data;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;
import org.springframework.data.neo4j.core.schema.GeneratedValue;

import java.util.HashSet;
import java.util.Set;

@Node
@Data
public class User {

    @Id
    private String username;

    private String name;

    // Outgoing relationship: This user FOLLOWS others
    @Relationship(type = "FOLLOWS", direction = Relationship.Direction.OUTGOING)
    private Set<User> following = new HashSet<>();

    // Outgoing relationship: This user LIKES an interest
    @Relationship(type = "LIKES", direction = Relationship.Direction.OUTGOING)
    private Set<Interest> interests = new HashSet<>();

    public void follow(User user) {
        following.add(user);
    }

    public void like(Interest interest) {
        interests.add(interest);
    }
}
